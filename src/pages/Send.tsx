import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import styles from './Send.module.css';

const Send = () => {
  const { hasWallet, walletAddress, isUnlocked, sendBaseEth } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hasWallet || !walletAddress) {
    return (
      <div className={styles.sendPage}>
        <div className={styles.errorMessage}>
          Please create a wallet first
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!recipient || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (!isUnlocked) {
      setError('Wallet is locked. Unlock from Home to send.');
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const hash = await sendBaseEth(recipient, amount);
      setTxHash(hash);
      setRecipient('');
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.sendPage}>
      <div className={styles.sendCard}>
        <h2>Send (Base ETH)</h2>

        <div className={styles.formGroup}>
          <label>Recipient Address</label>
          <input
            type="text"
            className={styles.inputField}
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Amount</label>
          <input
            type="number"
            className={styles.inputField}
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="any"
          />
        </div>

        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        {txHash && (
          <div className={styles.successMessage}>
            <p>Transaction sent!</p>
            <p className={styles.txHash}>Hash: {txHash.slice(0, 10)}...{txHash.slice(-8)}</p>
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewLink}
            >
              View on BaseScan
            </a>
          </div>
        )}

        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={loading || !recipient || !amount || !isUnlocked}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default Send;

