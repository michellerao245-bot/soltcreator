import React from 'react';
import './CreateHub.css';
import TokenForm from './TokenForm';
import NetworkSelector from './NetworkSelector';
// 🔥 ECOHUB se jo ConnectButton copy kiya tha, use yahan import kar liya
import ConnectButton from '../ConnectButton'; 

const CreateHub = () => {
  return (
    <div className="create-hub-container">
      {/* Background Decorative Elements for Cyberpunk Look */}
      <div className="glow-overlay"></div>
      
      <div className="hub-wrapper">
        {/* 🔥 WALLET CONNECTION ROW: Top Right par alignment ke liye code */}
        <div className="wallet-connect-row" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', width: '100%' }}>
          <ConnectButton />
        </div>

        {/* Header Section: Jaisa aapne SoltDex dashboard ke liye manga tha */}
        <div className="hub-header">
          <h1 className="highlight-title">SoltChain Token Hub</h1>
          <p className="hub-subtitle">
            Deploy secure, audited, and custom smart contracts in seconds. No coding required.
          </p>
        </div>

        {/* Action Section: Network selection and the main Token Form */}
        <div className="hub-main-content">
          <div className="glass-panel">
            <NetworkSelector />
            <hr className="divider" />
            <TokenForm />
          </div>
        </div>

        {/* Footer Info: Aapka trademark premium feel */}
        <div className="hub-footer">
          <p className="premium-highlight">Powered by SOLT Ecosystem</p>
          <span className="version-tag">v2.0.1 Stable</span>
        </div>
      </div>
    </div>
  );
};

export default CreateHub;