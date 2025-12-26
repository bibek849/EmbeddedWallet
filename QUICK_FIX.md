# Quick Fix: API Key Format Issue

## The Problem

Your current private key is in **base64 format** (no PEM headers), which means it's likely an **Ed25519** key. However, **Onramp v1 API requires ECDSA keys** in PEM format.

## The Solution

### Step 1: Create a New ECDSA API Key

1. Go to [Coinbase CDP Portal](https://portal.cdp.coinbase.com/)
2. Navigate to **API Keys** → **Secret API Keys**
3. Click **Create API key**
4. **CRITICAL**: When creating the key, in the **Advanced Settings**, select **ECDSA** as the signature algorithm (NOT Ed25519)
5. Give it a nickname (e.g., "Onramp ECDSA Key")
6. Click **Create API key**

### Step 2: Copy Your New ECDSA Key

After creating the ECDSA key, you'll see:

**API Key Name** (UUID format):
```
4aea4397-7187-4f01-bd77-16d39af38b43
```

**Private Key** (PEM format with headers):
```
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIJsB+NpntMgnAHSo16vS6ies3V6nu/liXhPMd7s7+lZ6oAoGCCqGSM49
AwEHoUQDQgAEs0MXQHmufOeRPhjeJOkyNPJjaZv.......Zb5S
FBoh2Je3Rkj3do3+CU6OVOI7MzXPCX33NQ==
-----END EC PRIVATE KEY-----
```

### Step 3: Update Your .env File

Replace the values in your `.env` file:

**Option A: Single line with \n (Recommended)**
```env
CDP_API_KEY_NAME=your-new-ecdsa-key-uuid-here
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIJsB+NpntMgnAHSo16vS6ies3V6nu/liXhPMd7s7+lZ6oAoGCCqGSM49\nAwEHoUQDQgAEs0MXQHmufOeRPhjeJOkyNPJjaZv.......Zb5S\nFBoh2Je3Rkj3do3+CU6OVOI7MzXPCX33NQ==\n-----END EC PRIVATE KEY-----
```

**Option B: Multi-line format (if your system supports it)**
```env
CDP_API_KEY_NAME=your-new-ecdsa-key-uuid-here
CDP_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIJsB+NpntMgnAHSo16vS6ies3V6nu/liXhPMd7s7+lZ6oAoGCCqGSM49
AwEHoUQDQgAEs0MXQHmufOeRPhjeJOkyNPJjaZv.......Zb5S
FBoh2Je3Rkj3do3+CU6OVOI7MzXPCX33NQ==
-----END EC PRIVATE KEY-----"
```

### Step 4: Restart the Server

1. Stop the backend server (Ctrl+C)
2. Start it again: `npm run server`
3. You should see: `✅ CDP API credentials loaded`

### Step 5: Test

Try the "Fund Wallet" button again - it should work now!

## How to Tell the Difference

- **Ed25519 Key** (base64, no headers): `TP5XAY0cqrTFK643BdmJ3yyyCRpqFNfTNF2B7791sllJCq4InAk2Vix6ZRQdKAo3Fyj+95LVx87p/JL/GgxP3w==`
- **ECDSA Key** (PEM format): `-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----`

## Still Having Issues?

Check the server console when you try to fund the wallet. The error message will now tell you exactly what's wrong with your key format.



