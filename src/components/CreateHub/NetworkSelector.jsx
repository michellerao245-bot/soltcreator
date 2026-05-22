import React from 'react';

const NetworkSelector = () => {
  return (
    <div className="network-selector-container">
      <h4 className="selector-label">Select Deployment Network</h4>
      <div className="network-options">
        {/* BSC Mainnet Option - Active state */}
        <div className="network-card active">
          <div className="network-icon">
            <img 
              src="https://cryptologos.cc/logos/bnb-bnb-logo.png" 
              alt="BSC" 
              width="24" 
            />
          </div>
          <div className="network-info">
            <span className="net-name">BSC Mainnet</span>
            <span className="net-status">Connected</span>
          </div>
          <div className="active-dot"></div>
        </div>

        {/* Testnet Option - Disabled for now */}
        <div className="network-card disabled">
          <div className="network-icon grayscale">
            <img 
              src="https://cryptologos.cc/logos/bnb-bnb-logo.png" 
              alt="BSC Testnet" 
              width="24" 
            />
          </div>
          <div className="network-info">
            <span className="net-name">BSC Testnet</span>
            <span className="net-status">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkSelector;