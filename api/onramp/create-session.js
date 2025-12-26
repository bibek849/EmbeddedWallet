import { generateCdpOnrampJwt, parseJsonBody } from '../_lib/cdpOnramp.js';

export const config = {
  runtime: 'nodejs',
};

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

    const { destinationAddress, purchaseCurrency, destinationNetwork, redirectUrl } = body;

    if (!destinationAddress || !purchaseCurrency || !destinationNetwork) {
      return res.status(400).json({
        error:
          'Missing required parameters: destinationAddress, purchaseCurrency, destinationNetwork',
      });
    }

    const token = await generateCdpOnrampJwt();

    // Map network names to Coinbase format (blockchain for "addresses.blockchains")
    const networkMap = {
      ethereum: 'ethereum',
      base: 'base',
      polygon: 'polygon',
      bitcoin: 'bitcoin',
    };
    const blockchain = networkMap[destinationNetwork] || destinationNetwork;

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

    const baseUrl = 'https://pay.coinbase.com/buy';
    const params = new URLSearchParams({
      sessionToken,
      defaultAsset: purchaseCurrency,
      defaultNetwork: destinationNetwork,
    });
    if (redirectUrl) params.append('redirectUrl', redirectUrl);

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


