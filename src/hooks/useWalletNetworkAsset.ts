import { useEffect, useMemo, useState } from 'react';
import { CHAINS, CHAIN_KEYS, type ChainKey } from '../config/chains';
import { TOKEN_CONTRACTS } from '../config/tokens';
import { useOnrampBuyOptions, type OnrampPurchaseCurrency } from './useOnrampBuyOptions';

export type SupportedAsset = {
  id: string;
  symbol: string;
  name: string;
  iconUrl?: string;
  byChain: Partial<
    Record<
      ChainKey,
      {
        chainId: number;
        networkName: ChainKey;
        networkDisplayName?: string;
        contractAddress?: string;
      }
    >
  >;
};

const STORAGE_CHAIN_KEY = 'wallet:selectedChainKey:v1';
const STORAGE_ASSET_ID = 'wallet:selectedAssetId:v1';

const FALLBACK_ASSETS: SupportedAsset[] = [
  {
    id: 'ETH',
    symbol: 'ETH',
    name: 'Ethereum',
    byChain: {
      base: { chainId: CHAINS.base.chainId, networkName: 'base' },
      ethereum: { chainId: CHAINS.ethereum.chainId, networkName: 'ethereum' },
      optimism: { chainId: CHAINS.optimism.chainId, networkName: 'optimism' },
      arbitrum: { chainId: CHAINS.arbitrum.chainId, networkName: 'arbitrum' },
      // NOTE: Polygon native token is MATIC. ETH may exist as a bridged token on Polygon,
      // but we only include it when Coinbase Buy Options provides a contract address.
    },
  },
  {
    id: 'MATIC',
    symbol: 'MATIC',
    name: 'Polygon',
    byChain: {
      polygon: { chainId: CHAINS.polygon.chainId, networkName: 'polygon' },
    },
  },
  {
    id: 'USDC',
    symbol: 'USDC',
    name: 'USD Coin',
    byChain: {
      base: {
        chainId: CHAINS.base.chainId,
        networkName: 'base',
        contractAddress: TOKEN_CONTRACTS.USDC.base,
      },
      ethereum: {
        chainId: CHAINS.ethereum.chainId,
        networkName: 'ethereum',
        contractAddress: TOKEN_CONTRACTS.USDC.ethereum,
      },
      optimism: {
        chainId: CHAINS.optimism.chainId,
        networkName: 'optimism',
        contractAddress: TOKEN_CONTRACTS.USDC.optimism,
      },
      arbitrum: {
        chainId: CHAINS.arbitrum.chainId,
        networkName: 'arbitrum',
        contractAddress: TOKEN_CONTRACTS.USDC.arbitrum,
      },
      polygon: {
        chainId: CHAINS.polygon.chainId,
        networkName: 'polygon',
        contractAddress: TOKEN_CONTRACTS.USDC.polygon,
      },
    },
  },
];

function safeGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function normalizeAssetsFromOnramp(purchaseCurrencies: OnrampPurchaseCurrency[]): SupportedAsset[] {
  const out: SupportedAsset[] = [];
  for (const c of purchaseCurrencies ?? []) {
    const symbol = String(c.symbol || c.id).toUpperCase();
    const byChain: SupportedAsset['byChain'] = {};
    for (const n of c.networks ?? []) {
      const rawName = String(n?.name || '').toLowerCase();
      // Docs sometimes return "ethereum-mainnet" style names.
      const normalizedName = rawName.replace(/-mainnet$/i, '').replace(/_mainnet$/i, '');
      const chainKey = normalizedName as ChainKey;
      if (!chainKey || !(chainKey in CHAINS)) continue;
      byChain[chainKey] = {
        chainId: Number(n.chain_id),
        networkName: chainKey,
        networkDisplayName: n.display_name ? String(n.display_name) : undefined,
        contractAddress: n.contract_address ? String(n.contract_address) : undefined,
      };
    }

    // If Coinbase doesn't return contract addresses (or endpoint is flaky),
    // fill in known contracts for common tokens so balances still work.
    if (symbol in TOKEN_CONTRACTS) {
      const map = (TOKEN_CONTRACTS as any)[symbol] as Partial<Record<ChainKey, string>>;
      for (const k of Object.keys(byChain) as ChainKey[]) {
        if (!byChain[k]?.contractAddress && map?.[k]) {
          byChain[k] = { ...byChain[k]!, contractAddress: map[k] };
        }
      }
    }

    // keep currencies that map to at least one of our supported chains
    if (Object.keys(byChain).length === 0) continue;
    out.push({
      id: String(c.id || c.symbol),
      symbol: String(c.symbol || c.id),
      name: String(c.name || c.symbol || c.id),
      iconUrl: c.icon_url ? String(c.icon_url) : undefined,
      byChain,
    });
  }
  return out;
}

export function useWalletNetworkAsset(opts?: { country?: string; subdivision?: string }) {
  const { purchaseCurrencies, loading: optionsLoading, error: optionsError } = useOnrampBuyOptions(opts);

  const assets = useMemo(() => {
    const normalized = normalizeAssetsFromOnramp(purchaseCurrencies);
    return normalized.length ? normalized : FALLBACK_ASSETS;
  }, [purchaseCurrencies]);

  const [selectedChainKey, setSelectedChainKeyState] = useState<ChainKey>(() => {
    const raw = safeGetLocalStorage(STORAGE_CHAIN_KEY);
    if (raw && (raw as ChainKey) in CHAINS) return raw as ChainKey;
    return 'base';
  });

  const [selectedAssetId, setSelectedAssetIdState] = useState<string>(() => {
    const raw = safeGetLocalStorage(STORAGE_ASSET_ID);
    return raw || 'ETH';
  });

  const assetsForSelectedChain = useMemo(() => {
    return assets.filter((a) => !!a.byChain[selectedChainKey]);
  }, [assets, selectedChainKey]);

  // Keep selection valid when options load / chain changes.
  useEffect(() => {
    if (!assetsForSelectedChain.length) return;
    const current = assetsForSelectedChain.find((a) => a.id === selectedAssetId);
    if (current) return;
    setSelectedAssetIdState(assetsForSelectedChain[0].id);
    safeSetLocalStorage(STORAGE_ASSET_ID, assetsForSelectedChain[0].id);
  }, [assetsForSelectedChain, selectedAssetId]);

  const selectedAsset = useMemo(() => {
    return assets.find((a) => a.id === selectedAssetId) ?? assetsForSelectedChain[0] ?? null;
  }, [assets, assetsForSelectedChain, selectedAssetId]);

  const selectedChain = CHAINS[selectedChainKey];

  const selectedAssetOnChain = selectedAsset ? selectedAsset.byChain[selectedChainKey] : undefined;
  const tokenAddress = selectedAssetOnChain?.contractAddress;
  const isNative =
    !!selectedAsset &&
    selectedAsset.symbol.toUpperCase() === selectedChain.nativeSymbol.toUpperCase() &&
    !tokenAddress;

  const setSelectedChainKey = (next: ChainKey) => {
    setSelectedChainKeyState(next);
    safeSetLocalStorage(STORAGE_CHAIN_KEY, next);
  };

  const setSelectedAssetId = (next: string) => {
    setSelectedAssetIdState(next);
    safeSetLocalStorage(STORAGE_ASSET_ID, next);
  };

  return {
    chains: CHAIN_KEYS,
    assets,
    assetsForSelectedChain,
    selectedChainKey,
    selectedChain,
    setSelectedChainKey,
    selectedAssetId,
    selectedAsset,
    setSelectedAssetId,
    tokenAddress,
    isNative,
    optionsLoading,
    optionsError,
  };
}


