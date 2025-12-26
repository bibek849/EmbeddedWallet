import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ethers } from 'ethers';
import { CHAINS, CHAIN_KEYS, type ChainKey } from '../config/chains';
import { decryptStringWithPasscode, encryptStringWithPasscode } from '../wallet/crypto';
import { getErc20Balance, getErc20Contract, getErc20Decimals } from '../wallet/erc20';
import {
  clearTheftPasscodeVerifier,
  clearTheftSetupPending,
  clearStoredWallet,
  getTheftPasscodeVerifier,
  getTheftSetupPending,
  getStoredWallet,
  setTheftPasscodeVerifier,
  setTheftSetupPending,
  setStoredWallet,
  type StoredWalletV1,
  type TheftPasscodeVerifierV1,
} from '../wallet/storage';

const THEFT_VERIFIER_PLAINTEXT = 'THEFT_PASSCODE_OK_v1';

interface WalletContextType {
  isLoading: boolean;
  walletAddress: string | null;
  hasWallet: boolean;
  isUnlocked: boolean;
  hasTheftPasscode: boolean;
  theftSetupPending: boolean;
  /** Sign an arbitrary message with the local wallet (requires unlock). */
  signMessage: (message: string) => Promise<string>;
  /** Back-compat: Base native balance */
  getBalance: (address: string) => Promise<string>;
  /** Multi-network native balance */
  getNativeBalance: (args: { address: string; chainKey: ChainKey }) => Promise<string>;
  /** ERC20 balance */
  getTokenBalance: (args: { address: string; chainKey: ChainKey; tokenAddress: string }) => Promise<string>;

  /** Back-compat: Base ETH send */
  sendBaseEth: (to: string, amountEth: string) => Promise<string>;
  /** Multi-network native send */
  sendNative: (args: { to: string; amount: string; chainKey: ChainKey }) => Promise<string>;
  /** ERC20 send (amount in human units) */
  sendErc20: (args: { tokenAddress: string; to: string; amount: string; chainKey: ChainKey }) => Promise<string>;
  createWallet: (passcode: string) => Promise<{ address: string; mnemonic: string }>;
  importWallet: (mnemonic: string, passcode: string) => Promise<{ address: string }>;
  unlock: (passcode: string) => Promise<void>;
  lock: () => void;
  setTheftPasscode: (theftPasscode: string) => Promise<void>;
  skipTheftSetup: () => Promise<void>;
  resetWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stored, setStored] = useState<StoredWalletV1 | null>(null);
  const [theftVerifier, setTheftVerifier] = useState<TheftPasscodeVerifierV1 | null>(null);
  const [theftSetupPending, setTheftSetupPendingState] = useState(false);
  const [unlockedWallet, setUnlockedWallet] = useState<ethers.HDNodeWallet | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const providers = useMemo(() => {
    const out = {} as Record<ChainKey, ethers.JsonRpcProvider>;
    for (const key of CHAIN_KEYS) {
      const info = CHAINS[key];
      const envKey = info.rpcUrlEnvVar ? String(info.rpcUrlEnvVar) : '';
      const envValue = envKey ? (import.meta.env as any)[envKey] : undefined;
      const rpcUrl = (envValue || info.defaultRpcUrl).toString();
      out[key] = new ethers.JsonRpcProvider(rpcUrl, { name: info.key, chainId: info.chainId });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    import.meta.env.VITE_BASE_RPC_URL,
    import.meta.env.VITE_ETHEREUM_RPC_URL,
    import.meta.env.VITE_OPTIMISM_RPC_URL,
    import.meta.env.VITE_ARBITRUM_RPC_URL,
    import.meta.env.VITE_POLYGON_RPC_URL,
  ]);

  const getProvider = useCallback(
    (chainKey: ChainKey) => {
      return providers[chainKey] ?? providers.base;
    },
    [providers],
  );

  const walletAddress = stored?.address ?? null;
  const hasWallet = !!walletAddress;
  const hasTheftPasscode = !!theftVerifier;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [existing, theft, pending] = await Promise.all([
          getStoredWallet(),
          getTheftPasscodeVerifier(),
          getTheftSetupPending(),
        ]);
        if (cancelled) return;
        setStored(existing);
        setTheftVerifier(theft);
        setTheftSetupPendingState(pending);
      } catch (e) {
        console.error('Failed to load wallet from storage:', e);
        if (cancelled) return;
        setStored(null);
        setTheftVerifier(null);
        setTheftSetupPendingState(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getBalance = useCallback(
    async (address: string): Promise<string> => {
      try {
        const balance = await providers.base.getBalance(address);
        return ethers.formatEther(balance);
      } catch (error) {
        console.error('Error fetching balance:', error);
        return '0';
      }
    },
    [providers.base],
  );

  const getNativeBalance = useCallback(
    async ({ address, chainKey }: { address: string; chainKey: ChainKey }): Promise<string> => {
      const provider = getProvider(chainKey);
      try {
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
      } catch (error) {
        console.error('Error fetching native balance:', error);
        return '0';
      }
    },
    [getProvider],
  );

  const getTokenBalance = useCallback(
    async ({
      address,
      chainKey,
      tokenAddress,
    }: {
      address: string;
      chainKey: ChainKey;
      tokenAddress: string;
    }): Promise<string> => {
      const provider = getProvider(chainKey);
      try {
        const chainId = CHAINS[chainKey].chainId;
        const { raw, decimals } = await getErc20Balance(tokenAddress, address, provider, { chainId });
        return ethers.formatUnits(raw, decimals);
      } catch (error) {
        console.error('Error fetching token balance:', error);
        return '0';
      }
    },
    [getProvider],
  );

  const createWallet = useCallback(
    async (passcode: string): Promise<{ address: string; mnemonic: string }> => {
      if (!passcode || passcode.length < 6) {
        throw new Error('Passcode must be at least 6 characters');
      }

      const randomWallet = ethers.Wallet.createRandom();
      const phrase = randomWallet.mnemonic?.phrase;
      if (!phrase) throw new Error('Failed to generate seed phrase');

      const derived = ethers.Wallet.fromPhrase(phrase);
      const address = derived.address;

      const encryptedMnemonic = await encryptStringWithPasscode(passcode, phrase);
      const record: StoredWalletV1 = {
        version: 1,
        address,
        encryptedMnemonic,
        createdAt: Date.now(),
      };

      await setStoredWallet(record);
      setStored(record);
      setUnlockedWallet(derived);
      setIsUnlocked(true);

      if (!theftVerifier) {
        await setTheftSetupPending(true);
        setTheftSetupPendingState(true);
      }
      return { address, mnemonic: phrase };
    },
    [theftVerifier],
  );

  const importWallet = useCallback(
    async (mnemonic: string, passcode: string): Promise<{ address: string }> => {
      if (!passcode || passcode.length < 6) {
        throw new Error('Passcode must be at least 6 characters');
      }

      const cleaned = mnemonic.trim().replace(/\s+/g, ' ');
      let derived: ethers.HDNodeWallet;
      try {
        derived = ethers.Wallet.fromPhrase(cleaned);
      } catch {
        throw new Error('Invalid seed phrase');
      }

      const address = derived.address;
      const encryptedMnemonic = await encryptStringWithPasscode(passcode, cleaned);
      const record: StoredWalletV1 = {
        version: 1,
        address,
        encryptedMnemonic,
        createdAt: Date.now(),
      };

      await setStoredWallet(record);
      setStored(record);
      setUnlockedWallet(derived);
      setIsUnlocked(true);

      if (!theftVerifier) {
        await setTheftSetupPending(true);
        setTheftSetupPendingState(true);
      }
      return { address };
    },
    [theftVerifier],
  );

  const setTheftPasscode = useCallback(async (theftPasscode: string) => {
    if (!theftPasscode || theftPasscode.length < 6) {
      throw new Error('Theft passcode must be at least 6 characters');
    }
    const verifier = await encryptStringWithPasscode(theftPasscode, THEFT_VERIFIER_PLAINTEXT);
    const record: TheftPasscodeVerifierV1 = { version: 1, verifier, createdAt: Date.now() };
    await setTheftPasscodeVerifier(record);
    setTheftVerifier(record);

    await setTheftSetupPending(false);
    setTheftSetupPendingState(false);
  }, []);

  const skipTheftSetup = useCallback(async () => {
    await setTheftSetupPending(false);
    setTheftSetupPendingState(false);
  }, []);

  const unlock = useCallback(
    async (passcode: string) => {
      if (!stored) throw new Error('No wallet found');
      if (!passcode) throw new Error('Passcode is required');

      // Duress / theft passcode path: entering the theft passcode wipes the existing wallet
      // and immediately replaces it with a fresh empty wallet (encrypted with the same passcode).
      if (theftVerifier) {
        try {
          const plaintext = await decryptStringWithPasscode(passcode, theftVerifier.verifier);
          if (plaintext === THEFT_VERIFIER_PLAINTEXT) {
            await clearStoredWallet();
            setStored(null);
            setUnlockedWallet(null);
            setIsUnlocked(false);
            await createWallet(passcode);
            return;
          }
        } catch {
          // Not the theft passcode; fall through to normal unlock.
        }
      }

      const phrase = await decryptStringWithPasscode(passcode, stored.encryptedMnemonic);
      const derived = ethers.Wallet.fromPhrase(phrase);
      if (derived.address.toLowerCase() !== stored.address.toLowerCase()) {
        throw new Error('Decryption succeeded but wallet address mismatch. Storage may be corrupted.');
      }
      setUnlockedWallet(derived);
      setIsUnlocked(true);
    },
    [createWallet, stored, theftVerifier],
  );

  const lock = useCallback(() => {
    setUnlockedWallet(null);
    setIsUnlocked(false);
  }, []);

  const signMessage = useCallback(
    async (message: string) => {
      if (!walletAddress) throw new Error('No wallet connected');
      if (!isUnlocked || !unlockedWallet) throw new Error('Wallet is locked. Unlock to continue.');
      return await unlockedWallet.signMessage(message);
    },
    [isUnlocked, unlockedWallet, walletAddress],
  );

  const resetWallet = useCallback(async () => {
    await clearStoredWallet();
    setStored(null);
    await clearTheftPasscodeVerifier();
    setTheftVerifier(null);
    await clearTheftSetupPending();
    setTheftSetupPendingState(false);
    setUnlockedWallet(null);
    setIsUnlocked(false);
  }, []);

  const sendNative = useCallback(
    async ({ to, amount, chainKey }: { to: string; amount: string; chainKey: ChainKey }): Promise<string> => {
      if (!walletAddress) throw new Error('No wallet connected');
      if (!isUnlocked || !unlockedWallet) throw new Error('Wallet is locked. Unlock to send.');
      if (!ethers.isAddress(to)) throw new Error('Invalid recipient address');

      const value = ethers.parseEther(amount);
      if (value <= 0n) throw new Error('Amount must be greater than 0');

      const provider = getProvider(chainKey);
      const expected = CHAINS[chainKey].chainId;
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== expected) {
        throw new Error(`Wrong network. Expected ${CHAINS[chainKey].displayName} (${expected}), got ${network.chainId.toString()}`);
      }

      const connected = unlockedWallet.connect(provider);
      const txResp = await connected.sendTransaction({ to, value });
      return txResp.hash;
    },
    [getProvider, isUnlocked, unlockedWallet, walletAddress],
  );

  const sendErc20 = useCallback(
    async ({
      tokenAddress,
      to,
      amount,
      chainKey,
    }: {
      tokenAddress: string;
      to: string;
      amount: string;
      chainKey: ChainKey;
    }): Promise<string> => {
      if (!walletAddress) throw new Error('No wallet connected');
      if (!isUnlocked || !unlockedWallet) throw new Error('Wallet is locked. Unlock to send.');
      if (!ethers.isAddress(to)) throw new Error('Invalid recipient address');
      if (!ethers.isAddress(tokenAddress)) throw new Error('Invalid token contract');

      const provider = getProvider(chainKey);
      const expected = CHAINS[chainKey].chainId;
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== expected) {
        throw new Error(`Wrong network. Expected ${CHAINS[chainKey].displayName} (${expected}), got ${network.chainId.toString()}`);
      }

      const decimals = await getErc20Decimals(expected, tokenAddress, provider);
      const value = ethers.parseUnits(amount, decimals);
      if (value <= 0n) throw new Error('Amount must be greater than 0');

      const signer = unlockedWallet.connect(provider);
      const token = getErc20Contract(tokenAddress, signer);
      const tx = await token.transfer(to, value);
      return String(tx?.hash ?? '');
    },
    [getProvider, isUnlocked, unlockedWallet, walletAddress],
  );

  const sendBaseEth = useCallback(
    async (to: string, amountEth: string): Promise<string> => {
      return sendNative({ to, amount: amountEth, chainKey: 'base' });
    },
    [sendNative],
  );

  return (
    <WalletContext.Provider
      value={{
        isLoading,
        walletAddress,
        hasWallet,
        isUnlocked,
        hasTheftPasscode,
        theftSetupPending,
        signMessage,
        getBalance,
        getNativeBalance,
        getTokenBalance,
        sendBaseEth,
        sendNative,
        sendErc20,
        createWallet,
        importWallet,
        unlock,
        lock,
        setTheftPasscode,
        skipTheftSetup,
        resetWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
