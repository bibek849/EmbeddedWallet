import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  return (
    <div className={styles.layout}>
      <header className={styles.topNav}>
        <div className={styles.topNavInner}>
          <div className={styles.brand}>
            <div className={styles.brandMark} aria-hidden="true" />
            <span className={styles.brandName}>EMBEDDED</span>
          </div>

          <div className={styles.topActions} aria-label="Top actions">
            <div className={styles.statusPill} title="System status">
              <span className={styles.statusDot} aria-hidden="true" />
              <span className={styles.statusText}>Operational</span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>{children}</main>

      <nav className={styles.bottomNav}>
        <Link
          to="/"
          className={`${styles.navItem} ${location.pathname === '/' ? styles.navItemActive : ''}`}
        >
          <span className={styles.navIcon} aria-hidden="true">⌂</span>
          <span className={styles.navLabel}>Home</span>
        </Link>
        <Link
          to="/send"
          className={`${styles.navItem} ${location.pathname === '/send' ? styles.navItemActive : ''}`}
        >
          <span className={styles.navIcon} aria-hidden="true">↑</span>
          <span className={styles.navLabel}>Send</span>
        </Link>
        <Link
          to="/receive"
          className={`${styles.navItem} ${location.pathname === '/receive' ? styles.navItemActive : ''}`}
        >
          <span className={styles.navIcon} aria-hidden="true">↓</span>
          <span className={styles.navLabel}>Receive</span>
        </Link>
        <Link
          to="/fund"
          className={`${styles.navItem} ${location.pathname === '/fund' ? styles.navItemActive : ''}`}
        >
          <span className={styles.navIcon} aria-hidden="true">$</span>
          <span className={styles.navLabel}>Fund</span>
        </Link>
      </nav>
    </div>
  );
};

export default Layout;



