import { useEffect, useMemo, useState } from 'react';
import { CHAINS, type ChainKey } from '../config/chains';

export type OnrampPurchaseCurrency = {
  id: string;
  name: string;
  symbol: string;
  icon_url?: string;
  networks: Array<{
    chain_id: number | string;
    contract_address?: string;
    display_name?: string;
    name: string; // e.g. "base", "ethereum"
  }>;
};

type BuyOptionsResponse = {
  purchaseCurrencies: OnrampPurchaseCurrency[];
};

const SESSION_KEY = 'onramp:buyOptions:v1';
const SESSION_TTL_MS = 10 * 60 * 1000;

function loadCached(): BuyOptionsResponse | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: BuyOptionsResponse };
    if (!parsed?.ts || !parsed?.data) return null;
    if (Date.now() - parsed.ts > SESSION_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function saveCached(data: BuyOptionsResponse) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore
  }
}

const SUPPORTED_CHAIN_KEYS = new Set<ChainKey>(Object.keys(CHAINS) as ChainKey[]);

export function useOnrampBuyOptions(opts?: { country?: string; subdivision?: string }) {
  const [purchaseCurrencies, setPurchaseCurrencies] = useState<OnrampPurchaseCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const cached = loadCached();
      if (cached?.purchaseCurrencies?.length) {
        setPurchaseCurrencies(cached.purchaseCurrencies);
        setLoading(false);
      }

      try {
        const params = new URLSearchParams();
        const country = (opts?.country || 'US').toUpperCase();
        // Coinbase docs indicate `subdivision` is required for US (e.g. NY) due to state restrictions.
        // Default to NY for demos if not supplied.
        const subdivision =
          opts?.subdivision
            ? opts.subdivision.toUpperCase()
            : country === 'US'
              ? 'NY'
              : undefined;
        params.set('country', country);
        if (subdivision) params.set('subdivision', subdivision);
        const res = await fetch(`/api/onramp/buy-options?${params.toString()}`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as BuyOptionsResponse;
        if (cancelled) return;
        setPurchaseCurrencies(data.purchaseCurrencies ?? []);
        saveCached({ purchaseCurrencies: data.purchaseCurrencies ?? [] });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load onramp options');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opts?.country, opts?.subdivision]);

  const supportedNetworks = useMemo(() => {
    const keys = new Set<ChainKey>();
    for (const currency of purchaseCurrencies) {
      for (const n of currency.networks ?? []) {
        const name = n?.name as ChainKey;
        if (name && SUPPORTED_CHAIN_KEYS.has(name)) keys.add(name);
      }
    }
    return Array.from(keys);
  }, [purchaseCurrencies]);

  return { purchaseCurrencies, supportedNetworks, loading, error };
}


