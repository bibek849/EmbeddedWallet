import { useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import styles from './EmailSignIn.module.css';

interface EmailSignInProps {
  onSuccess?: () => void;
  mode?: 'setup' | 'unlock';
}

const EmailSignIn = ({ onSuccess, mode }: EmailSignInProps) => {
  const { hasWallet, isUnlocked, importWallet, unlock, resetWallet } = useWallet();

  const effectiveMode: 'setup' | 'unlock' = useMemo(() => {
    if (mode) return mode;
    return hasWallet ? 'unlock' : 'setup';
  }, [hasWallet, mode]);

  const [tab, setTab] = useState<'create' | 'import'>('create');
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | null>(null);
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [savedSeed, setSavedSeed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePasscodes = () => {
    if (!passcode || passcode.length < 6) return 'Passcode must be at least 6 characters';
    if (passcode !== confirmPasscode) return 'Passcodes do not match';
    return null;
  };

  const handleGenerateSeed = () => {
    const w = ethers.Wallet.createRandom();
    const phrase = w.mnemonic?.phrase;
    if (!phrase) {
      setError('Failed to generate seed phrase. Please try again.');
      return;
    }
    setGeneratedMnemonic(phrase);
    setSavedSeed(false);
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!generatedMnemonic) {
      setError('Please generate a seed phrase first.');
      return;
    }

    const passErr = validatePasscodes();
    if (passErr) {
      setError(passErr);
      return;
    }
    if (!savedSeed) {
      setError('Please confirm you saved your seed phrase');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await importWallet(generatedMnemonic, passcode);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const passErr = validatePasscodes();
    if (passErr) {
      setError(passErr);
      return;
    }
    if (!mnemonicInput.trim()) {
      setError('Please enter your seed phrase');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await importWallet(mnemonicInput, passcode);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) {
      setError('Enter your passcode');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await unlock(passcode);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.emailSignin}>
      <div className={styles.signinCard}>
        {effectiveMode === 'unlock' ? (
          <>
            <h2>{isUnlocked ? 'Wallet Unlocked' : 'Unlock Wallet'}</h2>
            <p className={styles.subtitle}>Enter your passcode to enable sending</p>

            {!isUnlocked ? (
              <form onSubmit={handleUnlock} className={styles.signinForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="passcode">Passcode</label>
                  <input
                    id="passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="••••••"
                    disabled={loading}
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <button type="submit" disabled={loading} className={styles.primaryButton}>
                  {loading ? 'Unlocking...' : 'Unlock'}
                </button>

                {hasWallet && (
                  <button
                    type="button"
                    disabled={loading}
                    className={styles.secondaryButton}
                    onClick={async () => {
                      if (confirm('This will remove the wallet from this device. Continue?')) {
                        await resetWallet();
                      }
                    }}
                  >
                    Reset Wallet
                  </button>
                )}
              </form>
            ) : (
              <div className={styles.infoText}>You can now send funds from the Send tab.</div>
            )}
          </>
        ) : (
          <>
            <h2>Create or Import Wallet</h2>
            <p className={styles.subtitle}>Your seed phrase is encrypted and stored on this device</p>

            <div className={styles.tabRow}>
              <button
                type="button"
                className={`${styles.tabButton} ${tab === 'create' ? styles.tabButtonActive : ''}`}
                onClick={() => {
                  setTab('create');
                  setError(null);
                }}
              >
                Create
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${tab === 'import' ? styles.tabButtonActive : ''}`}
                onClick={() => {
                  setTab('import');
                  setError(null);
                }}
              >
                Import
              </button>
            </div>

            {tab === 'create' ? (
              <form onSubmit={handleCreate} className={styles.signinForm}>
                <div className={styles.formGroup}>
                  <label>Seed Phrase</label>
                  <div className={styles.seedBox}>
                    {generatedMnemonic ? (
                      <div className={styles.seedPhrase}>{generatedMnemonic}</div>
                    ) : (
                      <div className={styles.seedPlaceholder}>
                        Click “Create Wallet” to generate a new 12-word seed phrase.
                      </div>
                    )}
                  </div>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={savedSeed}
                      onChange={(e) => setSavedSeed(e.target.checked)}
                      disabled={loading || !generatedMnemonic}
                    />
                    I have saved my seed phrase securely
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="new-passcode">Passcode</label>
                  <input
                    id="new-passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="At least 6 characters"
                    disabled={loading}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirm-passcode">Confirm Passcode</label>
                  <input
                    id="confirm-passcode"
                    type="password"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Repeat passcode"
                    disabled={loading}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <button type="submit" disabled={loading} className={styles.primaryButton}>
                  {loading ? 'Saving...' : 'Create Wallet'}
                </button>

                {!generatedMnemonic && (
                  <button
                    type="button"
                    disabled={loading}
                    className={styles.secondaryButton}
                    onClick={handleGenerateSeed}
                  >
                    Generate Seed Phrase
                  </button>
                )}

                {generatedMnemonic && (
                  <button
                    type="button"
                    disabled={loading}
                    className={styles.secondaryButton}
                    onClick={() => {
                      navigator.clipboard.writeText(generatedMnemonic);
                    }}
                  >
                    Copy Seed Phrase
                  </button>
                )}

                <p className={styles.infoText}>
                  Warning: If you lose your seed phrase, you can’t recover funds if this device storage is cleared.
                </p>
              </form>
            ) : (
              <form onSubmit={handleImport} className={styles.signinForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="mnemonic">Seed Phrase</label>
                  <textarea
                    id="mnemonic"
                    className={styles.seedTextarea}
                    value={mnemonicInput}
                    onChange={(e) => setMnemonicInput(e.target.value)}
                    placeholder="Enter your 12-word seed phrase"
                    disabled={loading}
                    rows={3}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="import-passcode">Passcode</label>
                  <input
                    id="import-passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="At least 6 characters"
                    disabled={loading}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="import-confirm-passcode">Confirm Passcode</label>
                  <input
                    id="import-confirm-passcode"
                    type="password"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Repeat passcode"
                    disabled={loading}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <button type="submit" disabled={loading} className={styles.primaryButton}>
                  {loading ? 'Importing...' : 'Import Wallet'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmailSignIn;



