import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useWallet } from '../contexts/WalletContext';
import { useWalletNetworkAsset } from '../hooks/useWalletNetworkAsset';
import type { ChainKey } from '../config/chains';
import './Receive.css';

const Receive = () => {
  const { walletAddress, hasWallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === 'function';
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const {
    chains,
    assetsForSelectedChain,
    selectedChainKey,
    selectedChain,
    setSelectedChainKey,
    selectedAssetId,
    selectedAsset,
    setSelectedAssetId,
  } = useWalletNetworkAsset();

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
          text: `My ${selectedChain.displayName} wallet address (${selectedAsset?.symbol ?? selectedChain.nativeSymbol}): ${walletAddress}`,
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
        <h2>
          Receive ({selectedChain.displayName})
        </h2>
        <p className="subtitle">
          Share your address to receive {selectedAsset?.symbol ?? selectedChain.nativeSymbol} on {selectedChain.displayName}
        </p>

        <div className="selector-row" aria-label="Network and asset selection">
          <div>
            <div className="selector-label">Network</div>
            <select
              className="selector-select"
              value={selectedChainKey}
              onChange={(e) => setSelectedChainKey(e.target.value as ChainKey)}
            >
              {chains.map((k) => (
                <option key={k} value={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="selector-label">Asset</div>
            <select
              className="selector-select"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
            >
              {assetsForSelectedChain.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

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
            <li>{selectedChain.displayName} Mainnet</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Receive;



