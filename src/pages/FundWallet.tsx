import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import './FundWallet.css';

const SUPPORTED_ASSETS = [
  { symbol: 'ETH', name: 'Ethereum', networks: ['base'] },
  { symbol: 'USDC', name: 'USD Coin', networks: ['base'] },
];

const FundWallet = () => {
  const { walletAddress, hasWallet } = useWallet();
  const [selectedAsset, setSelectedAsset] = useState('ETH');
  const [selectedNetwork, setSelectedNetwork] = useState('base');
  const [loading, setLoading] = useState(false);

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
          purchaseCurrency: selectedAsset,
          destinationNetwork: selectedNetwork,
          redirectUrl: `${window.location.origin}/onramp-callback`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create onramp session');
      }

      const data = await response.json();
      const onrampUrl = data.onrampUrl;

      // Navigate to Coinbase Onramp using same-window navigation
      window.location.href = onrampUrl;
    } catch (error) {
      console.error('Error creating onramp session:', error);
      alert('Failed to initialize funding. Please try again.');
      setLoading(false);
    }
  };

  const selectedAssetInfo = SUPPORTED_ASSETS.find(a => a.symbol === selectedAsset);

  return (
    <div className="fund-wallet">
      <div className="fund-card">
        <h2>Fund Your Wallet</h2>
        <p className="subtitle">Buy cryptocurrency using Coinbase Onramp</p>

        <div className="form-group">
          <label>Select Cryptocurrency</label>
          <div className="asset-grid">
            {SUPPORTED_ASSETS.map((asset) => (
              <button
                key={asset.symbol}
                className={`asset-button ${selectedAsset === asset.symbol ? 'active' : ''}`}
                onClick={() => {
                  setSelectedAsset(asset.symbol);
                  setSelectedNetwork(asset.networks[0]);
                }}
              >
                <div className="asset-symbol">{asset.symbol}</div>
                <div className="asset-name">{asset.name}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedAssetInfo && selectedAssetInfo.networks.length > 1 && (
          <div className="form-group">
            <label>Select Network</label>
            <select
              className="network-select"
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
            >
              {selectedAssetInfo.networks.map((network) => (
                <option key={network} value={network}>
                  {network.charAt(0).toUpperCase() + network.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="destination-info">
          <div className="info-label">Destination Address</div>
          <div className="info-value">{walletAddress}</div>
        </div>

        <button
          className="fund-button"
          onClick={handleFundWallet}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Continue to Coinbase Onramp'}
        </button>

        <div className="info-note">
          <p>💡 You'll be redirected to Coinbase to complete your purchase. After completion, you'll be redirected back to this app.</p>
        </div>
      </div>
    </div>
  );
};

export default FundWallet;

