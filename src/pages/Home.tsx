import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import EmailSignIn from '../components/EmailSignIn';
import './Home.css';

const Home = () => {
  const { walletAddress, hasWallet, isUnlocked, isLoading, getBalance, lock } = useWallet();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (walletAddress) {
      loadBalance();
    }
  }, [walletAddress]);

  const loadBalance = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const bal = await getBalance(walletAddress);
      setBalance(parseFloat(bal).toFixed(6));
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

  if (!hasWallet || !walletAddress) {
    return (
      <div className="home">
        <EmailSignIn />
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
          <div className="balance-label">Balance</div>
          <div className="balance-amount">
            {loading ? 'Loading...' : `${balance} ETH (Base)`}
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
            💰 Fund Wallet
          </button>
          <button
            className="action-button send-button"
            onClick={() => navigate('/send')}
            disabled={!isUnlocked}
          >
            📤 Send
          </button>
          <button
            className="action-button receive-button"
            onClick={() => navigate('/receive')}
          >
            📥 Receive
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;

