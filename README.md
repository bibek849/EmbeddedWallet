# Embedded Wallet PWA (Local Wallet)

A Progressive Web App (PWA) for iOS, Android, and desktop webviews with a **local (seed phrase) wallet**, Coinbase Onramp integration, and Base send/receive.

## Features

- ✅ **Local Wallet**: Create a new wallet or import an existing seed phrase
- ✅ **Encrypted On-Device Storage**: Seed phrase is encrypted with a user passcode and stored in IndexedDB
- ✅ **Coinbase Onramp Integration**: Fund your wallet using Coinbase Onramp with same-window navigation (no popups)
- ✅ **Send & Receive**: Send and receive **Base ETH**
- ✅ **PWA Support**: Installable on iOS and Android devices
- ✅ **Base-only v1**: Keeps scope tight for reliability in webviews

## User Flow for Onramp

1. User clicks "Fund Wallet"
2. App navigates to Coinbase Onramp (same window using `window.location.href`)
3. User completes purchase on Coinbase
4. Coinbase redirects back to your app

## Prerequisites

- Node.js 18+ and npm
- Coinbase Developer Platform account
- CDP API credentials (API Key Name and Private Key)

## Setup Instructions

### 1. Get Coinbase CDP API Credentials

1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create a new project or use an existing one
3. **Get your Project ID**: 
   - Click the gear icon (⚙️) in your project to open project settings
   - Copy the **Project ID** value
4. **Create API Keys**:
   - Navigate to API Keys section
   - Create a new Secret API Key
   - Copy your API Key Name and Private Key

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Coinbase CDP credentials:
   ```
   # Frontend (optional)
   VITE_BASE_RPC_URL=https://mainnet.base.org

   # Backend - Required for Onramp API
   CDP_API_KEY_NAME=your_api_key_name
   CDP_API_KEY_PRIVATE_KEY=your_private_key_here
   ```

   **Important Notes:**
   - `VITE_BASE_RPC_URL` is optional; the app defaults to `https://mainnet.base.org`.
   - **Onramp v1** requires an **ECDSA** private key in **PEM** format (see `SETUP.md` / `API_KEY_FORMAT.md`).

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

Start the backend server (in one terminal):
```bash
npm run server
```

Start the frontend dev server (in another terminal):
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deploying to Vercel (recommended)

This repo contains:
- **Vite static frontend** (build output: `dist/`)
- **Backend API** used by the frontend at `/api/*` (implemented as Vercel Serverless Functions in `api/`)

## Optional: Separate Landing Page on Root Domain (recommended)

If you want a marketing/landing site on your root domain (e.g. `yourdomain.com`) and keep the wallet app on a subdomain (e.g. `app.yourdomain.com`), this repo includes a separate static landing site in `landing/`.

### Recommended domain split
- Landing: `https://yourdomain.com`
- Wallet app: `https://app.yourdomain.com`

### Create a separate Vercel project for the landing page
1. In Vercel, click **Add New → Project**
2. Import the same GitHub repo
3. Set **Root Directory** to `landing`
4. Framework preset: **Other**
5. Build Command: **leave empty**
6. Output Directory: `.` (dot)

### Configure the landing page “Open App” button
Edit `landing/config.js` and set:
- `appUrl: "https://app.yourdomain.com"`

### Attach domains (2 projects)
In Vercel → **Landing project → Settings → Domains**
- Add `yourdomain.com` (and optionally `www.yourdomain.com`)

In Vercel → **Wallet project → Settings → Domains**
- Add `app.yourdomain.com`

Vercel will show the exact DNS records to add at your registrar.

### Coinbase redirect allowlist reminder
If your wallet runs on `app.yourdomain.com`, make sure Coinbase allows:
- `https://app.yourdomain.com/onramp-callback`

### 1) Push to GitHub
Create a GitHub repo and push this project.

### 2) Import into Vercel
1. In Vercel, click **Add New → Project**
2. Import your GitHub repo
3. Vercel should detect Vite automatically. Build output is `dist/`.

### 3) Configure environment variables (Vercel → Project → Settings → Environment Variables)
Add:
- `CDP_API_KEY_NAME`
- `CDP_API_KEY_PRIVATE_KEY` (ECDSA PEM key; if you paste it as one line, keep `\n` between lines)

### 4) Add your custom domain
Vercel will provide DNS records. After DNS propagates, HTTPS is automatic.

### 5) Allowlist your redirect URL in Coinbase
In the Coinbase Developer Portal, allowlist:
- `https://YOUR_DOMAIN.com/onramp-callback`

### 6) Verify API is live
After deploy:
- `https://YOUR_DOMAIN.com/api/health` should return `{ "status": "ok", ... }`

## Project Structure

```
├── server/              # Backend API server
│   └── index.js        # Express server with Coinbase Onramp integration
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React contexts (WalletContext)
│   ├── pages/          # Page components
│   │   ├── Home.tsx    # Wallet overview
│   │   ├── FundWallet.tsx  # Coinbase Onramp integration
│   │   ├── Send.tsx    # Send cryptocurrency
│   │   ├── Receive.tsx # Receive cryptocurrency
│   │   └── OnrampCallback.tsx  # Handle Onramp redirect
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── .env.example        # Environment variables template
└── package.json        # Dependencies and scripts
```

## Coinbase Onramp Integration

The app uses Coinbase's Onramp API v1 to generate secure session tokens and create Onramp URLs. The integration follows these steps:

1. **Backend**: Generates a JWT using your CDP API credentials
2. **Backend**: Creates a session token via Coinbase API
3. **Backend**: Builds an Onramp URL with the session token and redirect URL
4. **Frontend**: Navigates to the Onramp URL using `window.location.href` (same-window navigation)
5. **User**: Completes purchase on Coinbase
6. **Coinbase**: Redirects back to `/onramp-callback` with transaction status

## PWA Configuration

The app is configured as a PWA with:
- Service worker for offline support
- Web app manifest for installability
- iOS-specific meta tags for better iOS experience
- Responsive design for mobile devices

## Supported Cryptocurrencies

- **ETH** (on Base)

## Security Notes

- ⚠️ **Seed Phrase Backup**: If device storage is cleared, funds are recoverable only if the user backed up the seed phrase.
- ⚠️ **Webview Storage**: Some webviews can purge storage; treat local wallets as “portable” via seed import.
- ⚠️ **API Keys**: Never commit your `.env` file. Keep your CDP API credentials secure.
- ⚠️ **HTTPS**: PWAs require HTTPS in production. Use a service like Vercel, Netlify, or your own HTTPS server.

## Testing on Mobile Devices

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will install as a PWA

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen" or "Install app"
4. The app will install as a PWA

## Troubleshooting

### Onramp not working
- Verify your CDP API credentials are correct
- Check that your redirect URL is added to the allowlist in Coinbase Developer Portal
- Ensure the backend server is running on port 3001

### Wallet not loading
- Check browser console for errors
- Verify localStorage is enabled
- Try creating a new wallet

## Resources

- [Coinbase Developer Documentation](https://docs.cdp.coinbase.com/)
- [Coinbase Onramp API Reference](https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/onramp-overview)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

## License

MIT
