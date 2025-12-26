import { generateCdpOnrampJwt, parseJsonBody } from '../_lib/cdpOnramp.js';

export const config = {
  runtime: 'nodejs',
};

function getClientIp(req) {
  // Prefer the network layer IP when available. In serverless/proxies we may only have forwarded headers.
  const xfwd = req?.headers?.['x-forwarded-for'];
  const fromHeader =
    typeof xfwd === 'string'
      ? xfwd.split(',')[0]?.trim()
      : Array.isArray(xfwd)
        ? xfwd[0]?.split(',')[0]?.trim()
        : undefined;
  const ip =
    fromHeader ||
    req?.socket?.remoteAddress ||
    req?.connection?.remoteAddress ||
    undefined;
  if (!ip) return undefined;
  const normalized = ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
  return isPublicIp(normalized) ? normalized : undefined;
}

function isPublicIp(ip) {
  if (typeof ip !== 'string') return false;
  const s = ip.trim().toLowerCase();
  if (!s) return false;

  // IPv6 loopback / unspecified / link-local / unique-local
  if (s === '::1' || s === '::') return false;
  if (s.startsWith('fe80:')) return false; // link-local
  if (s.startsWith('fc') || s.startsWith('fd')) return false; // unique local fc00::/7

  // IPv4
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = m.slice(1).map((x) => Number(x));
    if (a.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return false;
    const [o1, o2] = a;
    if (o1 === 10) return false;
    if (o1 === 127) return false;
    if (o1 === 0) return false;
    if (o1 === 169 && o2 === 254) return false; // link-local
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return false;
    if (o1 === 192 && o2 === 168) return false;
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return false; // CGNAT
    if (o1 >= 224) return false; // multicast/reserved
    return true;
  }

  // Otherwise, unknown format (treat as non-public)
  return false;
}

function looksLikeUuid(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = await parseJsonBody(req);
    if (body == null) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const {
      destinationAddress,
      purchaseCurrency,
      destinationNetwork,
      redirectUrl,
      partnerUserRef,
      // optional hint for URL defaults when purchaseCurrency is a UUID
      purchaseCurrencySymbol,
    } = body;

    if (!destinationAddress || !purchaseCurrency || !destinationNetwork) {
      return res.status(400).json({
        error:
          'Missing required parameters: destinationAddress, purchaseCurrency, destinationNetwork',
      });
    }

    const token = await generateCdpOnrampJwt({ requestMethod: 'POST', requestPath: '/onramp/v1/token' });

    // Map network names to Coinbase format (blockchain for "addresses.blockchains")
    const networkMap = {
      ethereum: 'ethereum',
      base: 'base',
      polygon: 'polygon',
      optimism: 'optimism',
      arbitrum: 'arbitrum',
      bitcoin: 'bitcoin',
      solana: 'solana',
    };
    const blockchain = networkMap[destinationNetwork] || destinationNetwork;
    const clientIp = getClientIp(req);

    const sessionTokenResponse = await fetch(
      'https://api.developer.coinbase.com/onramp/v1/token',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addresses: [
            {
              address: destinationAddress,
              blockchains: [blockchain],
            },
          ],
          assets: [purchaseCurrency],
          ...(clientIp ? { clientIp } : {}),
        }),
      }
    );

    if (!sessionTokenResponse.ok) {
      const errorText = await sessionTokenResponse.text();
      return res.status(500).json({
        error: 'Failed to create session token',
        details: errorText,
      });
    }

    const sessionData = await sessionTokenResponse.json();
    const sessionToken = sessionData?.token;
    if (!sessionToken) {
      return res.status(500).json({
        error: 'Failed to create session token',
        details: `Unexpected response from Coinbase: ${JSON.stringify(sessionData)}`,
      });
    }

    // Coinbase docs: https://pay.coinbase.com/buy/select-asset?sessionToken=<token>&...
    const baseUrl = 'https://pay.coinbase.com/buy/select-asset';
    const params = new URLSearchParams({ sessionToken });
    // defaultExperience is optional, but keeps the UX consistent.
    params.set('defaultExperience', 'buy');
    params.set('defaultNetwork', blockchain);
    // Avoid passing UUIDs as defaultAsset (hosted UI may expect symbol). If we only allow 1 asset
    // in the session token, the widget will naturally default to it anyway.
    const defaultAsset =
      typeof purchaseCurrencySymbol === 'string' && purchaseCurrencySymbol.trim()
        ? purchaseCurrencySymbol.trim()
        : looksLikeUuid(purchaseCurrency)
          ? undefined
          : String(purchaseCurrency);
    if (defaultAsset) params.set('defaultAsset', defaultAsset);
    if (redirectUrl) params.append('redirectUrl', redirectUrl);
    if (partnerUserRef) params.append('partnerUserRef', String(partnerUserRef).slice(0, 50));

    const onrampUrl = `${baseUrl}?${params.toString()}`;

    return res.json({
      onrampUrl,
      // Keep debug info out of prod responses.
      sessionToken: process.env.NODE_ENV === 'production' ? undefined : sessionToken,
    });
  } catch (error) {
    const message = error?.message ? String(error.message) : 'Unknown error';
    return res.status(500).json({
      error: 'Internal server error',
      message,
    });
  }
}


