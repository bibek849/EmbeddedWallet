# Coinbase CDP API Key Format Guide

## API Key Name Format

The `CDP_API_KEY_NAME` can be in one of two formats:

### Format 1: Simple UUID (Most Common)
```
CDP_API_KEY_NAME=4aea4397-7187-4f01-bd77-16d39af38b43
```
This is the **API Key ID** - a UUID you get from the CDP Portal.

### Format 2: Full Path (For Organization Keys)
```
CDP_API_KEY_NAME=organizations/{orgId}/apiKeys/{keyId}
```
This format is used when you have organization-level keys.

**For Onramp API, use Format 1 (the UUID).**

## Private Key Format

### For ECDSA Keys (Required for Onramp v1 API)

The private key should be in **PEM format** with headers:

```
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIJsB+NpntMgnAHSo16vS6ies3V6nu/liXhPMd7s7+lZ6oAoGCCqGSM49
AwEHoUQDQgAEs0MXQHmufOeRPhjeJOkyNPJjaZv.......Zb5S
FBoh2Je3Rkj3do3+CU6OVOI7MzXPCX33NQ==
-----END EC PRIVATE KEY-----
```

**Important Notes:**
- The key MUST include the `-----BEGIN EC PRIVATE KEY-----` header
- The key MUST include the `-----END EC PRIVATE KEY-----` footer
- The key data between headers should be base64-encoded
- In your `.env` file, you can put it on multiple lines OR use `\n` to represent newlines

### For Ed25519 Keys (Not supported by Onramp v1)

Ed25519 keys are just base64 strings (no headers):
```
CDP_API_KEY_PRIVATE_KEY=TP5XAY0cqrTFK643BdmJ3yyyCRpqFNfTNF2B7791sllJCq4InAk2Vix6ZRQdKAo3Fyj+95LVx87p/JL/GgxP3w==
```

**Onramp v1 API does NOT support Ed25519 keys - you MUST use ECDSA keys.**

## How to Get Your ECDSA Key

1. Go to [Coinbase CDP Portal](https://portal.cdp.coinbase.com/)
2. Navigate to **API Keys** → **Secret API Keys**
3. Click **Create API key**
4. **IMPORTANT**: When creating the key, select **ECDSA** as the signature algorithm (NOT Ed25519)
5. After creation, you'll see:
   - **API Key Name**: Copy the UUID (e.g., `4aea4397-7187-4f01-bd77-16d39af38b43`)
   - **Private Key**: If you download it, it will be in PEM format. If you copy it, make sure to get the full PEM format with headers.

## Example .env File

```env
# API Key Name (UUID format)
CDP_API_KEY_NAME=4aea4397-7187-4f01-bd77-16d39af38b43

# Private Key (PEM format with headers)
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIJsB+NpntMgnAHSo16vS6ies3V6nu/liXhPMd7s7+lZ6oAoGCCqGSM49\nAwEHoUQDQgAEs0MXQHmufOeRPhjeJOkyNPJjaZv.......Zb5S\nFBoh2Je3Rkj3do3+CU6OVOI7MzXPCX33NQ==\n-----END EC PRIVATE KEY-----
```

Or if you prefer multi-line format (some systems support this):
```env
CDP_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIJsB+NpntMgnAHSo16vS6ies3V6nu/liXhPMd7s7+lZ6oAoGCCqGSM49
AwEHoUQDQgAEs0MXQHmufOeRPhjeJOkyNPJjaZv.......Zb5S
FBoh2Je3Rkj3do3+CU6OVOI7MzXPCX33NQ==
-----END EC PRIVATE KEY-----"
```

## Troubleshooting

- **If you see "organizations" in the key name**: That's the full path format. You can use just the UUID part (the part after `/apiKeys/`).
- **If you see "BEGIN EC PRIVATE KEY"**: That's correct! That's the PEM format header. Make sure you have the complete key including both BEGIN and END lines.
- **If your key is just base64 without headers**: That's an Ed25519 key. You need to create a new ECDSA key for Onramp v1 API.



