import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ethers } from 'ethers';
import { decryptStringWithPasscode, encryptStringWithPasscode } from '../wallet/crypto';
import { clearStoredWallet, getStoredWallet, setStoredWallet, type StoredWalletV1 } from '../wallet/storage';

const BASE_CHAIN_ID = 8453;
const DEFAULT_BASE_RPC_URL = 'https://mainnet.base.org';

interface WalletContextType {
  isLoading: boolean;
  walletAddress: string | null;
  hasWallet: boolean;
  isUnlocked: boolean;
  getBalance: (address: string) => Promise<string>;
  sendBaseEth: (to: string, amountEth: string) => Promise<string>;
  createWallet: (passcode: string) => Promise<{ address: string; mnemonic: string }>;
  importWallet: (mnemonic: string, passcode: string) => Promise<{ address: string }>;
  unlock: (passcode: string) => Promise<void>;
  lock: () => void;
  resetWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stored, setStored] = useState<StoredWalletV1 | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const rpcUrl = (import.meta.env.VITE_BASE_RPC_URL || DEFAULT_BASE_RPC_URL).toString();
  const provider = useMemo(() => new ethers.JsonRpcProvider(rpcUrl, { name: 'base', chainId: BASE_CHAIN_ID }), [rpcUrl]);

  const walletAddress = stored?.address ?? null;
  const hasWallet = !!walletAddress;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getStoredWallet();
        if (cancelled) return;
        setStored(existing);
      } catch (e) {
        console.error('Failed to load wallet from storage:', e);
        if (cancelled) return;
        setStored(null);
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
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
      } catch (error) {
        console.error('Error fetching balance:', error);
        return '0';
      }
    },
    [provider],
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
      setSigner(derived.connect(provider));
      setIsUnlocked(true);
      return { address, mnemonic: phrase };
    },
    [provider],
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
      setSigner(derived.connect(provider));
      setIsUnlocked(true);
      return { address };
    },
    [provider],
  );

  const unlock = useCallback(
    async (passcode: string) => {
      if (!stored) throw new Error('No wallet found');
      if (!passcode) throw new Error('Passcode is required');
      const phrase = await decryptStringWithPasscode(passcode, stored.encryptedMnemonic);
      const derived = ethers.Wallet.fromPhrase(phrase);
      if (derived.address.toLowerCase() !== stored.address.toLowerCase()) {
        throw new Error('Decryption succeeded but wallet address mismatch. Storage may be corrupted.');
      }
      setSigner(derived.connect(provider));
      setIsUnlocked(true);
    },
    [provider, stored],
  );

  const lock = useCallback(() => {
    setSigner(null);
    setIsUnlocked(false);
  }, []);

  const resetWallet = useCallback(async () => {
    await clearStoredWallet();
    setStored(null);
    setSigner(null);
    setIsUnlocked(false);
  }, []);

  const sendBaseEth = useCallback(
    async (to: string, amountEth: string): Promise<string> => {
      if (!walletAddress) throw new Error('No wallet connected');
      if (!isUnlocked || !signer) throw new Error('Wallet is locked. Unlock to send.');
      if (!ethers.isAddress(to)) throw new Error('Invalid recipient address');

      const value = ethers.parseEther(amountEth);
      if (value <= 0n) throw new Error('Amount must be greater than 0');

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== BASE_CHAIN_ID) {
        throw new Error(`Wrong network. Expected Base (${BASE_CHAIN_ID}), got ${network.chainId.toString()}`);
      }

      const connected = signer.connect(provider);
      const txResp = await connected.sendTransaction({ to, value });
      return txResp.hash;
    },
    [isUnlocked, provider, signer, walletAddress],
  );

  return (
    <WalletContext.Provider
      value={{
        isLoading,
        walletAddress,
        hasWallet,
        isUnlocked,
        getBalance,
        sendBaseEth,
        createWallet,
        importWallet,
        unlock,
        lock,
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
