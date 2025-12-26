const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type EncryptedPayload = {
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
  iterations: number;
};

const DEFAULT_PBKDF2_ITERATIONS = 150_000;

function bytesToBase64(bytes: Uint8Array): string {
  // Avoid stack overflows on large arrays by chunking.
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveAesKeyFromPasscode(passcode: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', textEncoder.encode(passcode), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptStringWithPasscode(
  passcode: string,
  plaintext: string,
  opts?: { iterations?: number },
): Promise<EncryptedPayload> {
  const iterations = opts?.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKeyFromPasscode(passcode, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    textEncoder.encode(plaintext) as unknown as BufferSource,
  );
  return {
    saltB64: bytesToBase64(salt),
    ivB64: bytesToBase64(iv),
    ciphertextB64: bytesToBase64(new Uint8Array(ciphertext)),
    iterations,
  };
}

export async function decryptStringWithPasscode(passcode: string, payload: EncryptedPayload): Promise<string> {
  const salt = base64ToBytes(payload.saltB64);
  const iv = base64ToBytes(payload.ivB64);
  const ciphertext = base64ToBytes(payload.ciphertextB64);
  const key = await deriveAesKeyFromPasscode(passcode, salt, payload.iterations);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  );
  return textDecoder.decode(plaintext);
}


