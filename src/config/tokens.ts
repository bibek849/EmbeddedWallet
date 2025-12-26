import type { ChainKey } from './chains';

export type TokenSymbol = 'USDC' | 'USDT' | 'DAI';

/**
 * Known token contract addresses for popular assets across chains.
 * Used as a fallback when Coinbase Buy Options is unavailable, so balances still render.
 *
 * Notes:
 * - Addresses are mainnet contracts.
 * - This is intentionally small; Buy Options remains the preferred dynamic source.
 */
export const TOKEN_CONTRACTS: Record<TokenSymbol, Partial<Record<ChainKey, string>>> = {
  USDC: {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    // Coinbase Buy Options commonly returns the bridged USDC contract on Polygon for onramp.
    polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  },
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    // Base native USDT exists but varies by deployment; prefer Buy Options for Base/OP/Arb.
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  DAI: {
    ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    optimism: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    arbitrum: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
};


