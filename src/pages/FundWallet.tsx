import { useMemo, useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useWalletNetworkAsset } from '../hooks/useWalletNetworkAsset';
import type { ChainKey } from '../config/chains';
import './FundWallet.css';

const FundWallet = () => {
  const { walletAddress, hasWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const {
    chains,
    assetsForSelectedChain,
    selectedChainKey,
    selectedChain,
    setSelectedChainKey,
    selectedAssetId,
    selectedAsset,
    setSelectedAssetId,
    optionsLoading,
    optionsError,
  } = useWalletNetworkAsset();
  const [showAll, setShowAll] = useState(false);

  const visibleAssets = useMemo(() => {
    const list = assetsForSelectedChain;
    if (showAll) return list;
    return list.slice(0, 6);
  }, [assetsForSelectedChain, showAll]);

  if (!hasWallet || !walletAddress) {
    return (
      <div className="fund-wallet">
        <div className="error-message">
          Please create a wallet first
        </div>
      </div>
    );
  }

  const handleFundWallet = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      // Call backend API to generate Onramp URL
      const response = await fetch('/api/onramp/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationAddress: walletAddress,
          // Prefer symbol for best compatibility with Coinbase hosted UI defaults.
          purchaseCurrency: selectedAsset?.symbol ?? selectedAsset?.id ?? selectedAssetId,
          purchaseCurrencySymbol: selectedAsset?.symbol,
          destinationNetwork: selectedChainKey,
          redirectUrl: `${window.location.origin}/onramp-callback`,
          // Optional but useful: lets you query transaction status by this identifier later.
          partnerUserRef: walletAddress,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Failed to create onramp session');
      }

      const data = await response.json();
      const onrampUrl = data.onrampUrl;

      // Navigate to Coinbase Onramp using same-window navigation
      window.location.href = onrampUrl;
    } catch (error) {
      console.error('Error creating onramp session:', error);
      const msg = error instanceof Error ? error.message : 'Failed to initialize funding. Please try again.';
      alert(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fund-wallet">
      <div className="fund-card">
        <h2>Fund Your Wallet</h2>
        <p className="subtitle">Buy cryptocurrency using Coinbase Onramp</p>

        <div className="form-group">
          <label>Select Network</label>
          <select
            className="network-select"
            value={selectedChainKey}
            onChange={(e) => setSelectedChainKey(e.target.value as ChainKey)}
            disabled={loading}
          >
            {chains.map((k) => (
              <option key={k} value={k}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Cryptocurrency</label>
          <div className="asset-grid">
            {visibleAssets.map((asset) => (
              <button
                key={asset.id}
                className={`asset-button ${selectedAssetId === asset.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedAssetId(asset.id);
                }}
                disabled={loading}
              >
                <div className="asset-symbol">{asset.symbol}</div>
                <div className="asset-name">{asset.name}</div>
              </button>
            ))}
          </div>
        </div>

        {assetsForSelectedChain.length > 6 && (
          <div className="form-group" style={{ marginTop: '-0.5rem' }}>
            <button
              type="button"
              className="asset-button"
              style={{ width: '100%' }}
              onClick={() => setShowAll((v) => !v)}
              disabled={loading}
            >
              <div className="asset-symbol">{showAll ? 'Less' : 'More'}</div>
              <div className="asset-name">{showAll ? 'Show fewer assets' : 'Show all supported assets'}</div>
            </button>
          </div>
        )}

        {(optionsLoading || optionsError) && (
          <div className="info-note" style={{ marginBottom: '1.5rem' }}>
            <p>
              {optionsLoading
                ? 'Fetching the latest supported assets from Coinbase…'
                : 'Using a fallback asset list (Coinbase options endpoint unavailable).'}
            </p>
          </div>
        )}

        <div className="destination-info">
          <div className="info-label">Destination Address</div>
          <div className="info-value">{walletAddress}</div>
        </div>

        <button
          className="fund-button"
          onClick={handleFundWallet}
          disabled={loading || !selectedAsset}
        >
          {loading ? 'Loading...' : 'Continue to Coinbase Onramp'}
        </button>

        <div className="info-note">
          <p>
            💡 You’ll be redirected to Coinbase to complete your purchase of{' '}
            {selectedAsset?.symbol ?? 'your asset'} on {selectedChain.displayName}. After completion, you’ll be redirected
            back to this app.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FundWallet;

