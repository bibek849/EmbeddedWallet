import { assertCdpCredentials } from './_lib/cdpOnramp.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let credentialsConfigured = false;
    try {
      assertCdpCredentials();
      credentialsConfigured = true;
    } catch {
      credentialsConfigured = false;
    }

    return res.json({
      status: 'ok',
      credentialsConfigured,
    });
  } catch (error) {
    const message = error?.message ? String(error.message) : 'Unknown error';
    return res.status(500).json({ status: 'error', message });
  }
}


