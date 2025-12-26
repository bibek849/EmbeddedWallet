export type ChainKey = 'base' | 'ethereum' | 'optimism' | 'arbitrum' | 'polygon';

export type ChainInfo = {
  key: ChainKey;
  displayName: string;
  chainId: number;
  nativeSymbol: string;
  /** Used for onramp destinationNetwork/defaultNetwork */
  onrampNetworkName: ChainKey;
  rpcUrlEnvVar?: keyof ImportMetaEnv;
  defaultRpcUrl: string;
  explorer: {
    name: string;
    txUrl: (txHash: string) => string;
    addressUrl: (address: string) => string;
  };
};

export const CHAINS: Record<ChainKey, ChainInfo> = {
  base: {
    key: 'base',
    displayName: 'Base',
    chainId: 8453,
    nativeSymbol: 'ETH',
    onrampNetworkName: 'base',
    rpcUrlEnvVar: 'VITE_BASE_RPC_URL',
    defaultRpcUrl: 'https://mainnet.base.org',
    explorer: {
      name: 'BaseScan',
      txUrl: (hash) => `https://basescan.org/tx/${hash}`,
      addressUrl: (addr) => `https://basescan.org/address/${addr}`,
    },
  },
  ethereum: {
    key: 'ethereum',
    displayName: 'Ethereum',
    chainId: 1,
    nativeSymbol: 'ETH',
    onrampNetworkName: 'ethereum',
    rpcUrlEnvVar: 'VITE_ETHEREUM_RPC_URL',
    defaultRpcUrl: 'https://cloudflare-eth.com',
    explorer: {
      name: 'Etherscan',
      txUrl: (hash) => `https://etherscan.io/tx/${hash}`,
      addressUrl: (addr) => `https://etherscan.io/address/${addr}`,
    },
  },
  optimism: {
    key: 'optimism',
    displayName: 'Optimism',
    chainId: 10,
    nativeSymbol: 'ETH',
    onrampNetworkName: 'optimism',
    rpcUrlEnvVar: 'VITE_OPTIMISM_RPC_URL',
    defaultRpcUrl: 'https://mainnet.optimism.io',
    explorer: {
      name: 'OP Mainnet Explorer',
      txUrl: (hash) => `https://optimistic.etherscan.io/tx/${hash}`,
      addressUrl: (addr) => `https://optimistic.etherscan.io/address/${addr}`,
    },
  },
  arbitrum: {
    key: 'arbitrum',
    displayName: 'Arbitrum',
    chainId: 42161,
    nativeSymbol: 'ETH',
    onrampNetworkName: 'arbitrum',
    rpcUrlEnvVar: 'VITE_ARBITRUM_RPC_URL',
    defaultRpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: {
      name: 'Arbiscan',
      txUrl: (hash) => `https://arbiscan.io/tx/${hash}`,
      addressUrl: (addr) => `https://arbiscan.io/address/${addr}`,
    },
  },
  polygon: {
    key: 'polygon',
    displayName: 'Polygon',
    chainId: 137,
    nativeSymbol: 'MATIC',
    onrampNetworkName: 'polygon',
    rpcUrlEnvVar: 'VITE_POLYGON_RPC_URL',
    defaultRpcUrl: 'https://polygon-rpc.com',
    explorer: {
      name: 'Polygonscan',
      txUrl: (hash) => `https://polygonscan.com/tx/${hash}`,
      addressUrl: (addr) => `https://polygonscan.com/address/${addr}`,
    },
  },
};

export const CHAIN_KEYS: ChainKey[] = Object.keys(CHAINS) as ChainKey[];


