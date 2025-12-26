import { useEffect, useMemo, useState } from 'react';
import { Download, MoreVertical, Share2, X } from 'lucide-react';
import styles from './PwaInstall.module.css';

// beforeinstallprompt is Chromium-only and not in TS lib by default.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iphone|ipad|ipod/i.test(ua);
}

function isInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false;
  const inStandaloneDisplayMode = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  const legacyIosStandalone = (navigator as any)?.standalone === true;
  return inStandaloneDisplayMode || legacyIosStandalone;
}

export const PwaInstall = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isInstalledPwa());
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);

  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    const updateInstalled = () => setIsInstalled(isInstalledPwa());
    updateInstalled();

    const onBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing.
      e.preventDefault?.();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);

    // Keep installed state fresh (some browsers fire this after install)
    window.addEventListener('appinstalled', updateInstalled);

    // display-mode can change if user launches installed app
    const mm = window.matchMedia?.('(display-mode: standalone)');
    const onMm = () => updateInstalled();
    mm?.addEventListener?.('change', onMm);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', updateInstalled);
      mm?.removeEventListener?.('change', onMm);
    };
  }, []);

  // Always show when not installed. If native prompt isn't available, we show a manual help modal.
  const shouldShowInstall = !isInstalled;

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      try {
        await deferred.userChoice;
      } finally {
        setDeferred(null);
        setIsInstalled(isInstalledPwa());
      }
      return;
    }

    // iOS: no native install prompt in Safari. Show helper.
    if (isIos) setShowIosHelp(true);
    else setShowManualHelp(true);
  };

  useEffect(() => {
    if (!showIosHelp && !showManualHelp) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowIosHelp(false);
        setShowManualHelp(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showIosHelp, showManualHelp]);

  if (!shouldShowInstall) return null;

  return (
    <>
      <button type="button" className={styles.installButton} onClick={handleInstall} title="Install this app">
        <Download size={16} strokeWidth={2.25} aria-hidden="true" />
        <span className={styles.installText}>Install</span>
      </button>

      {showIosHelp && (
        <div className={styles.overlay} role="presentation" onClick={() => setShowIosHelp(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Install on iOS"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Install on iPhone / iPad</div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setShowIosHelp(false)}
                aria-label="Close"
              >
                <X size={16} strokeWidth={2.25} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalSubtitle}>
                iOS doesn’t support the one-tap install prompt. You can still install manually:
              </p>

              <ol className={styles.steps}>
                <li>
                  Tap <span className={styles.inlineIcon} aria-hidden="true"><Share2 size={14} strokeWidth={2.25} /></span>{' '}
                  <span className={styles.stepEm}>Share</span> in Safari
                </li>
                <li>
                  Select <span className={styles.stepEm}>Add to Home Screen</span>
                </li>
                <li>
                  Tap <span className={styles.stepEm}>Add</span>
                </li>
              </ol>

              <div className={styles.tipBox}>
                Tip: Open this app in <span className={styles.stepEm}>Safari</span> for the best install experience.
              </div>
            </div>
          </div>
        </div>
      )}

      {showManualHelp && (
        <div className={styles.overlay} role="presentation" onClick={() => setShowManualHelp(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Install"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Install</div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setShowManualHelp(false)}
                aria-label="Close"
              >
                <X size={16} strokeWidth={2.25} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalSubtitle}>
                If you don’t see an install prompt, you can install from your browser menu:
              </p>

              <ol className={styles.steps}>
                <li>
                  Open the browser menu{' '}
                  <span className={styles.inlineIcon} aria-hidden="true">
                    <MoreVertical size={14} strokeWidth={2.25} />
                  </span>
                </li>
                <li>
                  Choose <span className={styles.stepEm}>Install app</span> or{' '}
                  <span className={styles.stepEm}>Add to Home screen</span>
                </li>
                <li>
                  Confirm to finish installing
                </li>
              </ol>

              <div className={styles.tipBox}>
                Tip: Install works best over <span className={styles.stepEm}>HTTPS</span> and after the app has been
                visited once or twice.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


