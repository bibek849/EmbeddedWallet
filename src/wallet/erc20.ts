import { ethers } from 'ethers';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;

const DECIMALS_CACHE_KEY = 'erc20:decimals:v1';

function cacheKey(chainId: number, tokenAddress: string) {
  return `${chainId}:${tokenAddress.toLowerCase()}`;
}

function loadDecimalsCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DECIMALS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

function saveDecimalsCache(cache: Record<string, number>) {
  try {
    localStorage.setItem(DECIMALS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function getErc20Contract(tokenAddress: string, runner: ethers.ContractRunner) {
  return new ethers.Contract(tokenAddress, ERC20_ABI, runner);
}

export async function getErc20Decimals(chainId: number, tokenAddress: string, provider: ethers.Provider): Promise<number> {
  const cache = loadDecimalsCache();
  const k = cacheKey(chainId, tokenAddress);
  if (typeof cache[k] === 'number') return cache[k];

  const c = getErc20Contract(tokenAddress, provider);
  const decimals = Number(await c.decimals());
  cache[k] = decimals;
  saveDecimalsCache(cache);
  return decimals;
}

export async function getErc20Symbol(tokenAddress: string, provider: ethers.Provider): Promise<string> {
  const c = getErc20Contract(tokenAddress, provider);
  return String(await c.symbol());
}

export async function getErc20Balance(
  tokenAddress: string,
  owner: string,
  provider: ethers.Provider,
  opts?: { chainId?: number },
): Promise<{ raw: bigint; decimals: number }> {
  const c = getErc20Contract(tokenAddress, provider);
  const raw = (await c.balanceOf(owner)) as bigint;
  const chainId = opts?.chainId ?? Number((await provider.getNetwork()).chainId);
  const decimals = await getErc20Decimals(chainId, tokenAddress, provider);
  return { raw, decimals };
}


