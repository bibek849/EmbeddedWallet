import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import EmailSignIn from '../components/EmailSignIn';
import { useWalletNetworkAsset } from '../hooks/useWalletNetworkAsset';
import type { ChainKey } from '../config/chains';
import './Home.css';

const Home = () => {
  const { walletAddress, hasWallet, isUnlocked, isLoading, getNativeBalance, getTokenBalance, lock, theftSetupPending } =
    useWallet();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    chains,
    assetsForSelectedChain,
    selectedChainKey,
    selectedChain,
    setSelectedChainKey,
    selectedAssetId,
    selectedAsset,
    setSelectedAssetId,
    tokenAddress,
    isNative,
  } = useWalletNetworkAsset();

  useEffect(() => {
    if (walletAddress) {
      loadBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, selectedChainKey, selectedAssetId, tokenAddress, isNative]);

  const loadBalance = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const raw = isNative
        ? await getNativeBalance({ address: walletAddress, chainKey: selectedChainKey })
        : tokenAddress
          ? await getTokenBalance({ address: walletAddress, chainKey: selectedChainKey, tokenAddress })
          : '0';
      setBalance(parseFloat(raw).toFixed(6));
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="home">
        <div className="loading-card">
          <div className="loading-spinner">⏳</div>
          <p>Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (!hasWallet || !walletAddress || theftSetupPending) {
    return (
      <div className="home">
        <EmailSignIn mode={theftSetupPending ? 'theft' : undefined} />
      </div>
    );
  }

  return (
    <div className="home">
      <div className="wallet-card">
        <div className="wallet-header">
          <h2>Your Wallet</h2>
          <div className="header-actions">
            <button className="refresh-button" onClick={loadBalance} disabled={loading}>
              {loading ? '⏳' : '🔄'}
            </button>
            <button className="signout-button" onClick={lock} title="Lock Wallet">
              🔒
            </button>
          </div>
        </div>
        
        <div className="balance-section">
          <div className="selector-row" aria-label="Network and asset selection">
            <div className="selector">
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

            <div className="selector">
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

          <div className="balance-label">Balance</div>
          <div className="balance-amount">
            {loading
              ? 'Loading...'
              : `${balance} ${selectedAsset?.symbol ?? selectedChain.nativeSymbol} (${selectedChain.displayName})`}
          </div>
        </div>

        <div className="address-section">
          <div className="address-label">Address</div>
          <div className="address-value" onClick={() => {
            navigator.clipboard.writeText(walletAddress);
            alert('Address copied to clipboard!');
          }}>
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
        </div>

        {!isUnlocked && (
          <div style={{ marginBottom: '1.5rem' }}>
            <EmailSignIn mode="unlock" />
          </div>
        )}

        <div className="action-buttons">
          <button
            className="action-button fund-button"
            onClick={() => navigate('/fund')}
          >
            <span className="action-icon" aria-hidden="true">
              <CircleDollarSign size={18} strokeWidth={2.25} />
            </span>
            <span className="action-text">Fund Wallet</span>
          </button>
          <button
            className="action-button send-button"
            onClick={() => navigate('/send')}
            disabled={!isUnlocked}
          >
            <span className="action-icon" aria-hidden="true">
              <ArrowUpRight size={18} strokeWidth={2.25} />
            </span>
            <span className="action-text">Send</span>
          </button>
          <button
            className="action-button receive-button"
            onClick={() => navigate('/receive')}
          >
            <span className="action-icon" aria-hidden="true">
              <ArrowDownLeft size={18} strokeWidth={2.25} />
            </span>
            <span className="action-text">Receive</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;

