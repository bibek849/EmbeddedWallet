import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CircleDollarSign } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useWalletNetworkAsset } from '../hooks/useWalletNetworkAsset';
import type { ChainKey } from '../config/chains';
import styles from './Send.module.css';

type SendErrorInfo = {
  title: string;
  message: string;
  details?: string;
  cta?: 'fund';
};

const toErrorString = (err: unknown) => {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || String(err);
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

const getSendErrorInfo = (err: unknown, ctx?: { chainName?: string }) : SendErrorInfo => {
  const message = toErrorString(err);

  // Try to preserve details for debugging without forcing users to read them.
  let details: string | undefined;
  try {
    if (err && typeof err === 'object') details = JSON.stringify(err, null, 2);
  } catch {
    details = undefined;
  }

  const lower = message.toLowerCase();
  const code = (err as any)?.code ?? (err as any)?.info?.error?.code;

  if (code === 'INSUFFICIENT_FUNDS' || lower.includes('insufficient funds')) {
    return {
      title: 'Not enough balance',
      message: 'You don’t have enough balance to cover the amount + network fee (gas). Fund your wallet and try again.',
      details: details ?? message,
      cta: 'fund',
    };
  }

  if (lower.includes('invalid recipient address') || (code === 'INVALID_ARGUMENT' && lower.includes('address'))) {
    return {
      title: 'Invalid recipient address',
      message: 'Please double-check the address and try again.',
      details: details ?? message,
    };
  }

  if (lower.includes('amount must be greater than 0')) {
    return {
      title: 'Invalid amount',
      message: 'Enter an amount greater than 0.',
      details: details ?? message,
    };
  }

  if (lower.includes('wrong network')) {
    return {
      title: 'Wrong network',
      message: `Please switch to ${ctx?.chainName ?? 'the selected network'} and try again.`,
      details: details ?? message,
    };
  }

  return {
    title: 'Transaction failed',
    message: 'Something went wrong while sending. Please try again.',
    details: details ?? message,
  };
};

const Send = () => {
  const { hasWallet, walletAddress, isUnlocked, sendNative, sendErc20 } = useWallet();
  const navigate = useNavigate();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<SendErrorInfo | null>(null);
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

  const assetSupported = isNative || !!tokenAddress;

  const canSend = useMemo(() => {
    return !!recipient && !!amount && isUnlocked && !loading && assetSupported;
  }, [amount, assetSupported, isUnlocked, loading, recipient]);

  if (!hasWallet || !walletAddress) {
    return (
      <div className={styles.sendPage}>
        <div className={styles.notice} data-variant="error">
          <div className={styles.noticeHeader}>
            <span className={styles.noticeIcon} aria-hidden="true">
              <AlertTriangle size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.noticeTitle}>No wallet found</div>
          </div>
          <div className={styles.noticeBody}>Please create a wallet first.</div>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!recipient || !amount) {
      setError({ title: 'Missing details', message: 'Please fill in recipient and amount.' });
      return;
    }

    if (!isUnlocked) {
      setError({ title: 'Wallet locked', message: 'Unlock your wallet from Home to send.' });
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const hash = isNative
        ? await sendNative({ to: recipient, amount, chainKey: selectedChainKey })
        : tokenAddress
          ? await sendErc20({ tokenAddress, to: recipient, amount, chainKey: selectedChainKey })
          : (() => {
              throw new Error('Selected asset is not supported on this network.');
            })();
      setTxHash(hash);
      setRecipient('');
      setAmount('');
    } catch (err: any) {
      setError(getSendErrorInfo(err, { chainName: selectedChain.displayName }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.sendPage}>
      <div className={styles.sendCard}>
        <h2>
          Send ({selectedAsset?.symbol ?? selectedChain.nativeSymbol} on {selectedChain.displayName})
        </h2>

        <div className={styles.selectorRow} aria-label="Network and asset selection">
          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label>Network</label>
            <select
              className={styles.selectField}
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

          <div className={styles.formGroup} style={{ marginBottom: 0 }}>
            <label>Asset</label>
            <select
              className={styles.selectField}
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              disabled={loading}
            >
              {assetsForSelectedChain.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!assetSupported && (
          <div className={styles.selectHint}>This asset isn’t available on the selected network.</div>
        )}

        <div className={styles.formGroup}>
          <label>Recipient Address</label>
          <input
            type="text"
            className={styles.inputField}
            placeholder="0x..."
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Amount</label>
          <input
            type="number"
            className={styles.inputField}
            placeholder="0.0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError(null);
            }}
            step="any"
          />
        </div>

        {error && (
          <div className={styles.notice} data-variant="error" role="alert" aria-live="polite">
            <div className={styles.noticeHeader}>
              <span className={styles.noticeIcon} aria-hidden="true">
                <AlertTriangle size={18} strokeWidth={2.25} />
              </span>
              <div className={styles.noticeTitle}>{error.title}</div>
            </div>

            <div className={styles.noticeBody}>{error.message}</div>

            {(error.cta === 'fund' || error.details) && (
              <div className={styles.noticeFooter}>
                {error.cta === 'fund' && (
                  <button
                    type="button"
                    className={styles.noticeCta}
                    onClick={() => navigate('/fund')}
                    disabled={loading}
                  >
                    <CircleDollarSign size={16} strokeWidth={2.25} />
                    Fund wallet
                  </button>
                )}

                {error.details && (
                  <details className={styles.noticeDetails}>
                    <summary className={styles.noticeSummary}>Show details</summary>
                    <pre className={styles.noticePre}>{error.details}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {txHash && (
          <div className={styles.successMessage}>
            <p>Transaction sent!</p>
            <p className={styles.txHash}>Hash: {txHash.slice(0, 10)}...{txHash.slice(-8)}</p>
            <a
              href={selectedChain.explorer.txUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewLink}
            >
              View on {selectedChain.explorer.name}
            </a>
          </div>
        )}

        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!canSend}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default Send;

