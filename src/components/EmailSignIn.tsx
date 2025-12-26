import { useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import styles from './EmailSignIn.module.css';

interface EmailSignInProps {
  onSuccess?: () => void;
  mode?: 'setup' | 'unlock' | 'theft';
}

const EmailSignIn = ({ onSuccess, mode }: EmailSignInProps) => {
  const {
    hasWallet,
    isUnlocked,
    importWallet,
    unlock,
    resetWallet,
    setTheftPasscode,
    skipTheftSetup,
  } = useWallet();

  const effectiveMode: 'setup' | 'unlock' | 'theft' = useMemo(() => {
    if (mode) return mode;
    return hasWallet ? 'unlock' : 'setup';
  }, [hasWallet, mode]);

  const [tab, setTab] = useState<'create' | 'import'>('create');
  const [setupStep, setSetupStep] = useState<'choose' | 'create' | 'import' | 'theft'>('choose');
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | null>(null);
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [theftPasscode, setTheftPasscodeValue] = useState('');
  const [confirmTheftPasscode, setConfirmTheftPasscode] = useState('');
  const [savedSeed, setSavedSeed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePasscodes = () => {
    if (!passcode || passcode.length < 6) return 'Passcode must be at least 6 characters';
    if (passcode !== confirmPasscode) return 'Passcodes do not match';
    return null;
  };

  const validateTheftPasscodesRequired = () => {
    if (!theftPasscode) return 'Enter a theft passcode';
    if (theftPasscode.length < 6) return 'Theft passcode must be at least 6 characters';
    if (theftPasscode !== confirmTheftPasscode) return 'Theft passcodes do not match';
    if (theftPasscode === passcode) return 'Theft passcode must be different from your main passcode';
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
      setSetupStep('theft');
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
      setSetupStep('theft');
    } catch (err: any) {
      setError(err.message || 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableTheftPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    const theftErr = validateTheftPasscodesRequired();
    if (theftErr) {
      setError(theftErr);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await setTheftPasscode(theftPasscode);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to enable theft protection');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipTheftPasscode = async () => {
    setLoading(true);
    setError(null);
    try {
      await skipTheftSetup();
      if (onSuccess) onSuccess();
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
        ) : effectiveMode === 'theft' ? (
          <>
            <h2>Theft Protection</h2>
            <p className={styles.subtitle}>Optional, but recommended</p>

            <div className={styles.theftIntro}>
              <div className={styles.theftHero} aria-hidden="true">
                <div className={styles.theftHalo} />
                <div className={styles.theftShield}>
                  <svg viewBox="0 0 24 24" width="22" height="22" role="img" aria-label="Shield icon">
                    <path
                      fill="currentColor"
                      d="M12 2.25c.2 0 .4.04.58.12l7 3.11c.53.24.87.76.87 1.34v6.17c0 3.88-2.46 7.43-6.17 8.9l-1.74.69c-.34.14-.72.14-1.06 0l-1.74-.69C5.03 20.42 2.57 16.87 2.57 12.99V6.82c0-.58.34-1.1.87-1.34l7-3.11c.18-.08.38-.12.56-.12Zm0 2.1L4.82 7.54v5.45c0 3.01 1.9 5.84 4.77 6.98L12 20.9l2.41-.93c2.87-1.14 4.77-3.97 4.77-6.98V7.54L12 4.35Z"
                    />
                  </svg>
                </div>
              </div>

              <p className={styles.theftBody}>
                Set a second passcode for emergencies. If you’re ever forced to open your wallet, enter this code instead of your
                normal passcode.
              </p>
              <p className={styles.theftBody}>
                Your wallet on this device will be erased and replaced with a new empty wallet.
              </p>

              <form onSubmit={handleEnableTheftPasscode} className={styles.signinForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="theft-passcode">Theft Passcode</label>
                  <input
                    id="theft-passcode"
                    type="password"
                    value={theftPasscode}
                    onChange={(e) => setTheftPasscodeValue(e.target.value)}
                    placeholder="At least 6 characters"
                    disabled={loading}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirm-theft-passcode">Confirm Theft Passcode</label>
                  <input
                    id="confirm-theft-passcode"
                    type="password"
                    value={confirmTheftPasscode}
                    onChange={(e) => setConfirmTheftPasscode(e.target.value)}
                    placeholder="Repeat theft passcode"
                    disabled={loading}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className={styles.disclaimer}>
                  This is irreversible. If you enter the theft passcode, the wallet stored on this device is wiped and can’t be
                  restored from this device.
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <button type="submit" disabled={loading} className={styles.primaryButton}>
                  {loading ? 'Enabling...' : 'Enable Theft Protection'}
                </button>

                <button type="button" disabled={loading} className={styles.secondaryButton} onClick={handleSkipTheftPasscode}>
                  Skip for now
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <h2>Create or Import Wallet</h2>
            <p className={styles.subtitle}>Your seed phrase is encrypted and stored on this device</p>

            <div className={styles.setupFlow} data-step={setupStep}>
              <div className={styles.choicePanel} aria-hidden={setupStep !== 'choose'}>
                <div className={styles.choiceGrid}>
                  <button
                    type="button"
                    className={styles.choiceCard}
                    onClick={() => {
                      setSetupStep('create');
                      setTab('create');
                      setError(null);
                    }}
                    disabled={loading}
                    aria-label="Create a new wallet"
                  >
                    <div className={styles.choiceTopRow}>
                      <span className={styles.choiceIcon} aria-hidden="true">
                        +
                      </span>
                      <span className={styles.choiceTitle}>Create</span>
                    </div>
                    <span className={styles.choiceBody}>Generate a new 12-word seed phrase on this device.</span>
                  </button>

                  <button
                    type="button"
                    className={styles.choiceCard}
                    onClick={() => {
                      setSetupStep('import');
                      setTab('import');
                      setError(null);
                    }}
                    disabled={loading}
                    aria-label="Import an existing wallet"
                  >
                    <div className={styles.choiceTopRow}>
                      <span className={styles.choiceIcon} aria-hidden="true">
                        ↩
                      </span>
                      <span className={styles.choiceTitle}>Import</span>
                    </div>
                    <span className={styles.choiceBody}>Bring an existing wallet using your seed phrase.</span>
                  </button>
                </div>

                <p className={styles.choiceHint}>You can switch anytime.</p>
              </div>

              <div className={styles.formPanel} aria-hidden={setupStep === 'choose'}>
                {setupStep !== 'theft' ? (
                  <>
                    <div className={styles.formTopBar}>
                      <button
                        type="button"
                        className={styles.backButton}
                        onClick={() => {
                          setSetupStep('choose');
                          setError(null);
                        }}
                        disabled={loading}
                      >
                        Back
                      </button>

                      <div className={styles.segmented} data-active={tab} role="tablist" aria-label="Wallet setup mode">
                        <span className={styles.segmentedIndicator} aria-hidden="true" />
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tab === 'create'}
                          className={styles.segmentedButton}
                          onClick={() => {
                            setTab('create');
                            setError(null);
                          }}
                          disabled={loading}
                        >
                          Create
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={tab === 'import'}
                          className={styles.segmentedButton}
                          onClick={() => {
                            setTab('import');
                            setError(null);
                          }}
                          disabled={loading}
                        >
                          Import
                        </button>
                      </div>
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

                {!generatedMnemonic ? (
                  <button
                    type="button"
                    disabled={loading}
                    className={styles.primaryButton}
                    onClick={handleGenerateSeed}
                  >
                    Generate Seed Phrase
                  </button>
                ) : (
                  <button type="submit" disabled={loading} className={styles.primaryButton}>
                    {loading ? 'Saving...' : 'Create Wallet'}
                  </button>
                )}

                {generatedMnemonic && (
                  <div className={styles.buttonRow}>
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
                    <button
                      type="button"
                      disabled={loading}
                      className={styles.secondaryButton}
                      onClick={handleGenerateSeed}
                    >
                      Regenerate
                    </button>
                  </div>
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
                ) : (
                  <div className={styles.theftIntro}>
                    <div className={styles.theftHero} aria-hidden="true">
                      <div className={styles.theftHalo} />
                      <div className={styles.theftShield}>
                        <svg viewBox="0 0 24 24" width="22" height="22" role="img" aria-label="Shield icon">
                          <path
                            fill="currentColor"
                            d="M12 2.25c.2 0 .4.04.58.12l7 3.11c.53.24.87.76.87 1.34v6.17c0 3.88-2.46 7.43-6.17 8.9l-1.74.69c-.34.14-.72.14-1.06 0l-1.74-.69C5.03 20.42 2.57 16.87 2.57 12.99V6.82c0-.58.34-1.1.87-1.34l7-3.11c.18-.08.38-.12.56-.12Zm0 2.1L4.82 7.54v5.45c0 3.01 1.9 5.84 4.77 6.98L12 20.9l2.41-.93c2.87-1.14 4.77-3.97 4.77-6.98V7.54L12 4.35Z"
                          />
                        </svg>
                      </div>
                    </div>

                    <h3 className={styles.theftTitle}>Theft Protection</h3>
                    <p className={styles.theftBody}>
                      Set a second passcode for emergencies. If you’re ever forced to open your wallet, enter this code instead of
                      your normal passcode.
                    </p>
                    <p className={styles.theftBody}>
                      Your wallet on this device will be erased and replaced with a new empty wallet.
                    </p>

                    <form onSubmit={handleEnableTheftPasscode} className={styles.signinForm}>
                      <div className={styles.formGroup}>
                        <label htmlFor="theft-passcode">Theft Passcode</label>
                        <input
                          id="theft-passcode"
                          type="password"
                          value={theftPasscode}
                          onChange={(e) => setTheftPasscodeValue(e.target.value)}
                          placeholder="At least 6 characters"
                          disabled={loading}
                          required
                          autoComplete="new-password"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="confirm-theft-passcode">Confirm Theft Passcode</label>
                        <input
                          id="confirm-theft-passcode"
                          type="password"
                          value={confirmTheftPasscode}
                          onChange={(e) => setConfirmTheftPasscode(e.target.value)}
                          placeholder="Repeat theft passcode"
                          disabled={loading}
                          required
                          autoComplete="new-password"
                        />
                      </div>

                      <div className={styles.disclaimer}>
                        This is irreversible. If you enter the theft passcode, the wallet stored on this device is wiped and can’t
                        be restored from this device.
                      </div>

                      {error && <div className={styles.errorMessage}>{error}</div>}

                      <button type="submit" disabled={loading} className={styles.primaryButton}>
                        {loading ? 'Enabling...' : 'Enable Theft Protection'}
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        className={styles.secondaryButton}
                        onClick={handleSkipTheftPasscode}
                      >
                        Skip for now
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailSignIn;



