import { Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Send from './pages/Send';
import Receive from './pages/Receive';
import FundWallet from './pages/FundWallet';
import OnrampCallback from './pages/OnrampCallback';

function App() {
  return (
    <WalletProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/send" element={<Send />} />
          <Route path="/receive" element={<Receive />} />
          <Route path="/fund" element={<FundWallet />} />
          <Route path="/onramp-callback" element={<OnrampCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </WalletProvider>
  );
}

export default App;



