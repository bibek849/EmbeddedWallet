import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnrampCallback.css';

const OnrampCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const navigate = useNavigate();

  useEffect(() => {
    // Check URL parameters for transaction status
    const urlParams = new URLSearchParams(window.location.search);
    const transactionStatus = urlParams.get('status');
    const transactionId = urlParams.get('transactionId');

    if (transactionStatus === 'success' || transactionId) {
      setStatus('success');
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } else {
      setStatus('error');
      setTimeout(() => {
        navigate('/fund');
      }, 3000);
    }
  }, [navigate]);

  return (
    <div className="callback-page">
      <div className="callback-card">
        {status === 'loading' && (
          <>
            <div className="loading-spinner">⏳</div>
            <h2>Processing...</h2>
            <p>Please wait while we process your transaction</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="success-icon">✅</div>
            <h2>Transaction Successful!</h2>
            <p>Your funds are being sent to your wallet. This may take a few minutes.</p>
            <p className="redirect-text">Redirecting to home...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="error-icon">❌</div>
            <h2>Transaction Incomplete</h2>
            <p>Your transaction was not completed. Please try again.</p>
            <p className="redirect-text">Redirecting to fund page...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OnrampCallback;



