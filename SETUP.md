# Quick Setup Guide

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Configure Coinbase API Credentials

1. Get your credentials from [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
   - **Project ID**: Go to your project settings (gear icon) and copy the Project ID
   - **API Key**: Create a Secret API Key in the API Keys section
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your credentials:
   ```
   # Frontend (optional)
   VITE_BASE_RPC_URL=https://mainnet.base.org

   # Backend (for Onramp API)
   CDP_API_KEY_NAME=your_api_key_name_here
   CDP_API_KEY_PRIVATE_KEY=your_private_key_here
   ```

**Important**: 
   - `VITE_BASE_RPC_URL` is optional; the app defaults to `https://mainnet.base.org`.
   - **API Key Type**: For Onramp v1 API, you **MUST** create an **ECDSA** key (NOT Ed25519)
   - **Private Key Format**: ECDSA keys are in **PEM format** with headers:
     ```
     CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\n[base64 key data]\n-----END EC PRIVATE KEY-----
     ```
   - When creating the API key in CDP Portal, make sure to select **ECDSA** as the signature algorithm
   - Ed25519 keys (base64 without headers) will NOT work with Onramp v1 API

## Step 3: Start the Servers

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Dev Server:**
```bash
npm run dev
```

## Step 4: Configure Redirect URL

1. Go to [Coinbase Developer Portal](https://portal.cdp.coinbase.com/)
2. Navigate to your project settings
3. Add your redirect URL to the allowlist:
   - For local development: `http://localhost:3000/onramp-callback`
   - For production: `https://yourdomain.com/onramp-callback`

## Step 5: Test the App

1. Open `http://localhost:3000` in your browser
2. Create a wallet
3. Click "Fund Wallet" to test the Coinbase Onramp integration
4. The app will navigate to Coinbase (same window)
5. After completing the purchase, you'll be redirected back

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory. Deploy this to a hosting service that supports HTTPS (required for PWAs).

## Troubleshooting

### "CDP API credentials not configured"
- Make sure your `.env` file exists and has the correct values
- Check that the private key includes the `\n` characters or actual newlines

### Onramp redirect not working
- Verify the redirect URL is added to your Coinbase app's allowlist
- Check that the backend server is running on port 3001
- Check browser console for errors

### Wallet not persisting
- Check browser localStorage is enabled
- Try clearing browser cache and creating a new wallet

