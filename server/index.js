import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();

const app = express();
const requestedPort = Number(process.env.PORT);
// Avoid colliding with the Vite dev server default (3000). Many setups have PORT=3000 in .env.
const PORT = Number.isFinite(requestedPort) && requestedPort !== 3000 ? requestedPort : 3001;
if (requestedPort === 3000) {
  console.warn('⚠️  Detected PORT=3000 in environment. Using PORT=3001 for the backend to avoid Vite port collision.');
}

app.use(cors());
app.use(express.json());

// Coinbase CDP API credentials (set these in .env file)
const CDP_API_KEY_NAME = process.env.CDP_API_KEY_NAME;
const CDP_API_KEY_PRIVATE_KEY = process.env.CDP_API_KEY_PRIVATE_KEY;

// Generate JWT for Coinbase CDP API authentication
async function generateJWT(opts = {}) {
  if (!CDP_API_KEY_NAME || !CDP_API_KEY_PRIVATE_KEY) {
    throw new Error('CDP API credentials not configured');
  }

  let privateKey = CDP_API_KEY_PRIVATE_KEY.trim();
  
  // Check key format
  const isPEMFormat = privateKey.includes('-----BEGIN');
  const isBase64Only = !isPEMFormat && /^[A-Za-z0-9+/=]+$/.test(privateKey);
  
  // For Onramp v1 API, we need ECDSA keys in PEM format
  if (!isPEMFormat) {
    if (isBase64Only) {
      throw new Error(
        'Your private key appears to be Ed25519 (base64 format). ' +
        'Onramp v1 API requires ECDSA keys in PEM format. ' +
        'Please create a new API key with ECDSA algorithm in the CDP Portal. ' +
        'ECDSA keys will have "-----BEGIN EC PRIVATE KEY-----" headers.'
      );
    } else {
      throw new Error('Invalid private key format. Expected PEM format with -----BEGIN EC PRIVATE KEY----- headers.');
    }
  }
  
  // Handle newlines in PEM format (if stored with \n in .env)
  // Also remove any quotes that might wrap the key
  privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  
  // Ensure the key has proper newlines - if it's all on one line, try to format it
  if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN')) {
    // Key is on one line, try to add newlines after headers
    privateKey = privateKey.replace(/-----BEGIN EC PRIVATE KEY-----/, '-----BEGIN EC PRIVATE KEY-----\n');
    privateKey = privateKey.replace(/-----END EC PRIVATE KEY-----/, '\n-----END EC PRIVATE KEY-----');
  }
  
  const requestMethod = String(opts.requestMethod || 'POST').toUpperCase();
  const requestHost = 'api.developer.coinbase.com';
  const requestPath = String(opts.requestPath || '/onramp/v1/token');
  const uri = `${requestMethod} ${requestHost}${requestPath}`;
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: CDP_API_KEY_NAME,
    iss: 'cdp',
    nbf: now,
    exp: now + 120, // 2 minutes expiration
    uri: uri,
  };

  // Generate a random nonce for the JWT header
  const nonce = crypto.randomBytes(16).toString('hex');

  try {
    // Sign JWT with ES256 algorithm using jsonwebtoken
    // Coinbase CDP APIs typically expect `kid` and `nonce` in the JWT header.
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      header: {
        kid: CDP_API_KEY_NAME,
        nonce,
      },
    });
    return token;
  } catch (error) {
    console.error('JWT signing error:', error.message);
    if (error.message.includes('PEM') || error.message.includes('key')) {
      throw new Error(
        `JWT signing failed: ${error.message}. ` +
        'Please verify your ECDSA private key is in correct PEM format with BEGIN/END headers.'
      );
    }
    throw new Error(`JWT signing failed: ${error.message}`);
  }
}

// Create Onramp Session endpoint
app.post('/api/onramp/create-session', async (req, res) => {
  try {
    const { destinationAddress, purchaseCurrency, destinationNetwork, redirectUrl } = req.body;

    if (!destinationAddress || !purchaseCurrency || !destinationNetwork) {
      return res.status(400).json({
        error: 'Missing required parameters: destinationAddress, purchaseCurrency, destinationNetwork',
      });
    }

    // Generate JWT for authentication
    console.log('Generating JWT...');
    const token = await generateJWT({ requestMethod: 'POST', requestPath: '/onramp/v1/token' });
    console.log('JWT generated successfully');

    // Map network names to Coinbase format
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
    console.log('Request params:', { destinationAddress, purchaseCurrency, destinationNetwork, blockchain });

    // Create session token using Coinbase CDP API
    // Using v1 API for session token creation
    console.log('Calling Coinbase API...');
    const sessionTokenResponse = await fetch(
      'https://api.developer.coinbase.com/onramp/v1/token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
    console.log('Coinbase API response status:', sessionTokenResponse.status);

    if (!sessionTokenResponse.ok) {
      const errorText = await sessionTokenResponse.text();
      console.error('Coinbase API error:', errorText);
      return res.status(500).json({
        error: 'Failed to create session token',
        details: errorText,
      });
    }

    const sessionData = await sessionTokenResponse.json();
    const sessionToken = sessionData.token;

    // Build Onramp URL
    const baseUrl = 'https://pay.coinbase.com/buy';
    const params = new URLSearchParams({
      sessionToken: sessionToken,
      defaultAsset: purchaseCurrency,
      defaultNetwork: destinationNetwork,
    });

    if (redirectUrl) {
      params.append('redirectUrl', redirectUrl);
    }

    const onrampUrl = `${baseUrl}?${params.toString()}`;

    res.json({
      onrampUrl,
      sessionToken, // For debugging, remove in production
    });
  } catch (error) {
    console.error('Error creating onramp session:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Unknown error';
    let errorDetails = error.stack;
    
    if (error.message.includes('ES256') || error.message.includes('ECDSA')) {
      errorMessage = 'Invalid API key format. Onramp v1 API requires an ECDSA key (ES256 algorithm). Please create a new API key with ECDSA algorithm in the CDP Portal.';
    }
    
    // Always send a response, even if there's an error
    try {
      res.status(500).json({
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        errorName: error.name,
      });
    } catch (sendError) {
      console.error('Failed to send error response:', sendError);
    }
  }
});

// Buy Options endpoint (discovers supported assets/networks for a country)
app.get('/api/onramp/buy-options', async (req, res) => {
  try {
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

    const token = await generateJWT({ requestMethod: 'GET', requestPath: '/onramp/v1/buy/options' });

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
    res.json({
      purchaseCurrencies: payload?.purchase_currencies ?? payload?.purchaseCurrencies ?? [],
      paymentCurrencies: payload?.payment_currencies ?? payload?.paymentCurrencies ?? [],
    });
  } catch (error) {
    console.error('Error fetching buy options:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    // Test if credentials are configured
    const hasCredentials = !!(CDP_API_KEY_NAME && CDP_API_KEY_PRIVATE_KEY);
    res.json({ 
      status: 'ok',
      credentialsConfigured: hasCredentials
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY in .env file');

  // Check if credentials are set
  if (!CDP_API_KEY_NAME || !CDP_API_KEY_PRIVATE_KEY) {
    console.warn('⚠️  WARNING: CDP API credentials not configured!');
    console.warn('   Set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY in .env file');
  } else {
    console.log('✅ CDP API credentials loaded');
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('Close the other running backend, or free the port:');
    console.error(`  - PowerShell: Get-NetTCPConnection -State Listen -LocalPort ${PORT} | Select OwningProcess`);
    console.error(`  - Then: taskkill /PID <pid> /F`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});

