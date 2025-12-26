import { generateCdpOnrampJwt } from '../_lib/cdpOnramp.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const country = String(req.query?.country || 'US').toUpperCase();
    // Coinbase docs indicate `subdivision` is required for US (e.g. NY) due to state restrictions.
    // Default to NY for demos if not supplied.
    const subdivision =
      req.query?.subdivision
        ? String(req.query.subdivision).toUpperCase()
        : country === 'US'
          ? 'NY'
          : undefined;
    const networks = req.query?.networks ? String(req.query.networks) : undefined;

    const token = await generateCdpOnrampJwt({ requestMethod: 'GET', requestPath: '/onramp/v1/buy/options' });

    const url = new URL('https://api.developer.coinbase.com/onramp/v1/buy/options');
    url.searchParams.set('country', country);
    if (subdivision) url.searchParams.set('subdivision', subdivision);
    if (networks) url.searchParams.set('networks', networks);

    const optionsResp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!optionsResp.ok) {
      const errorText = await optionsResp.text();
      return res.status(500).json({
        error: 'Failed to fetch buy options',
        details: errorText,
      });
    }

    const data = await optionsResp.json();
    const payload = data?.data ?? data;
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    return res.json({
      purchaseCurrencies: payload?.purchase_currencies ?? payload?.purchaseCurrencies ?? [],
      paymentCurrencies: payload?.payment_currencies ?? payload?.paymentCurrencies ?? [],
    });
  } catch (error) {
    const message = error?.message ? String(error.message) : 'Unknown error';
    return res.status(500).json({
      error: 'Internal server error',
      message,
    });
  }
}


