import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function getEnv(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v : undefined;
}

function normalizePemPrivateKey(raw) {
  if (!raw) return raw;

  let privateKey = raw.trim();

  // Remove any wrapping quotes that might be present in env providers.
  privateKey = privateKey.replace(/^["']|["']$/g, '');

  // Handle PEM newlines stored as "\n"
  privateKey = privateKey.replace(/\\n/g, '\n');

  // If it's PEM but all on one line, try to insert newlines around headers.
  if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN')) {
    privateKey = privateKey.replace(
      /-----BEGIN EC PRIVATE KEY-----/,
      '-----BEGIN EC PRIVATE KEY-----\n'
    );
    privateKey = privateKey.replace(
      /-----END EC PRIVATE KEY-----/,
      '\n-----END EC PRIVATE KEY-----'
    );
  }

  return privateKey;
}

export function assertCdpCredentials() {
  const CDP_API_KEY_NAME = getEnv('CDP_API_KEY_NAME');
  const CDP_API_KEY_PRIVATE_KEY = getEnv('CDP_API_KEY_PRIVATE_KEY');

  if (!CDP_API_KEY_NAME || !CDP_API_KEY_PRIVATE_KEY) {
    throw new Error('CDP API credentials not configured');
  }

  return {
    CDP_API_KEY_NAME,
    CDP_API_KEY_PRIVATE_KEY: normalizePemPrivateKey(CDP_API_KEY_PRIVATE_KEY),
  };
}

export function validatePrivateKeyFormat(privateKey) {
  const isPEMFormat = privateKey.includes('-----BEGIN');
  const isBase64Only = !isPEMFormat && /^[A-Za-z0-9+/=]+$/.test(privateKey);

  // Onramp v1 API requires ECDSA keys in PEM format (ES256).
  if (!isPEMFormat) {
    if (isBase64Only) {
      throw new Error(
        'Your private key appears to be Ed25519 (base64 format). ' +
          'Onramp v1 API requires ECDSA keys in PEM format. ' +
          'Please create a new API key with ECDSA algorithm in the CDP Portal. ' +
          'ECDSA keys will have "-----BEGIN EC PRIVATE KEY-----" headers.'
      );
    }
    throw new Error(
      'Invalid private key format. Expected PEM format with -----BEGIN EC PRIVATE KEY----- headers.'
    );
  }
}

export async function generateCdpOnrampJwt() {
  const { CDP_API_KEY_NAME, CDP_API_KEY_PRIVATE_KEY } = assertCdpCredentials();
  validatePrivateKeyFormat(CDP_API_KEY_PRIVATE_KEY);

  const requestMethod = 'POST';
  const requestHost = 'api.developer.coinbase.com';
  const requestPath = '/onramp/v1/token';
  const uri = `${requestMethod} ${requestHost}${requestPath}`;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: CDP_API_KEY_NAME,
    iss: 'cdp',
    nbf: now,
    exp: now + 120, // 2 minutes expiration
    uri,
  };

  const nonce = crypto.randomBytes(16).toString('hex');

  try {
    return jwt.sign(payload, CDP_API_KEY_PRIVATE_KEY, {
      algorithm: 'ES256',
      header: {
        kid: CDP_API_KEY_NAME,
        nonce,
      },
    });
  } catch (error) {
    const message = error?.message ? String(error.message) : 'Unknown error';
    throw new Error(
      `JWT signing failed: ${message}. Please verify your ECDSA private key is in correct PEM format with BEGIN/END headers.`
    );
  }
}

export async function parseJsonBody(req) {
  if (req?.body && typeof req.body === 'object') return req.body;
  if (typeof req?.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}


