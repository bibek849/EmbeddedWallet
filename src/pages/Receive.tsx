import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useWallet } from '../contexts/WalletContext';
import './Receive.css';

const Receive = () => {
  const { walletAddress, hasWallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === 'function';
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let t: number | undefined;
    if (copied) {
      t = window.setTimeout(() => setCopied(false), 2000);
    }
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [copied]);

  if (!hasWallet || !walletAddress) {
    return (
      <div className="receive-page">
        <div className="error-message">Please create a wallet first</div>
      </div>
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await QRCode.toDataURL(walletAddress, {
          width: 240,
          margin: 1,
        });
        if (!cancelled) setQrDataUrl(url);
      } catch (e) {
        console.error('Failed to generate QR code:', e);
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
    } catch {
      // Clipboard may fail in some iOS/webview contexts; fallback to prompt.
      window.prompt('Copy your address:', walletAddress);
    }
  };

  const handleShare = async () => {
    if (canShare) {
      try {
        await navigator.share({
          title: 'My Wallet Address',
          text: `My Base wallet address: ${walletAddress}`,
        });
        return;
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
    await handleCopy();
  };

  return (
    <div className="receive-page">
      <div className="receive-card">
        <h2>Receive (Base)</h2>
        <p className="subtitle">Share your address to receive Base ETH</p>

        <div className="qr-placeholder">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Wallet address QR code"
              style={{ width: 240, height: 240, borderRadius: 12, background: 'white', padding: 12 }}
            />
          ) : (
            <>
              <div className="qr-icon">📱</div>
              <p>Generating QR…</p>
            </>
          )}
        </div>

        <div className="address-section">
          <div className="address-label">Your Wallet Address</div>
          <div className="address-value" onClick={handleCopy}>
            {walletAddress}
          </div>
          {copied && <div className="copied-indicator">✓ Copied!</div>}
        </div>

        <div className="action-buttons">
          <button className="copy-button" onClick={handleCopy}>
            {copied ? '✓ Copied' : '📋 Copy Address'}
          </button>
          {canShare && (
            <button className="share-button" onClick={handleShare}>
              📤 Share
            </button>
          )}
        </div>

        <div className="info-box">
          <h3>Network</h3>
          <ul>
            <li>Base Mainnet</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Receive;



