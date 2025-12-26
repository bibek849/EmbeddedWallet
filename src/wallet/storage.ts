import type { EncryptedPayload } from './crypto';

export type StoredWalletV1 = {
  version: 1;
  address: string; // store in cleartext so user can receive/fund while locked
  encryptedMnemonic: EncryptedPayload;
  createdAt: number;
};

export type TheftPasscodeVerifierV1 = {
  version: 1;
  verifier: EncryptedPayload;
  createdAt: number;
};

const DB_NAME = 'embeddedWallet';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const WALLET_KEY = 'wallet_v1';
const THEFT_VERIFIER_KEY = 'theft_passcode_verifier_v1';
const THEFT_SETUP_PENDING_KEY = 'theft_setup_pending_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function getValue<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error ?? new Error('Failed to read from IndexedDB'));
  });
}

async function setValue<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value as any, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('Failed to write to IndexedDB'));
  });
}

async function deleteValue(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('Failed to delete from IndexedDB'));
  });
}

export async function getStoredWallet(): Promise<StoredWalletV1 | null> {
  return getValue<StoredWalletV1>(WALLET_KEY);
}

export async function setStoredWallet(wallet: StoredWalletV1): Promise<void> {
  await setValue(WALLET_KEY, wallet);
}

export async function clearStoredWallet(): Promise<void> {
  await deleteValue(WALLET_KEY);
}

export async function getTheftPasscodeVerifier(): Promise<TheftPasscodeVerifierV1 | null> {
  return getValue<TheftPasscodeVerifierV1>(THEFT_VERIFIER_KEY);
}

export async function setTheftPasscodeVerifier(record: TheftPasscodeVerifierV1): Promise<void> {
  await setValue(THEFT_VERIFIER_KEY, record);
}

export async function clearTheftPasscodeVerifier(): Promise<void> {
  await deleteValue(THEFT_VERIFIER_KEY);
}

export async function getTheftSetupPending(): Promise<boolean> {
  return (await getValue<boolean>(THEFT_SETUP_PENDING_KEY)) ?? false;
}

export async function setTheftSetupPending(pending: boolean): Promise<void> {
  await setValue<boolean>(THEFT_SETUP_PENDING_KEY, pending);
}

export async function clearTheftSetupPending(): Promise<void> {
  await deleteValue(THEFT_SETUP_PENDING_KEY);
}


