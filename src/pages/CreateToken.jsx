import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateToken.css';

const CreateToken = () => {
  const navigate = useNavigate();

  const tokenTypes = [
    {
      id: 'standard',
      name: 'Standard Token',
      desc: 'Basic BEP-20 token with fixed supply. Simple, clean, and professional.',
      fee: '2000 SOLT',
      icon: '💎',
      path: '/standard-token'
    },
    {
      id: 'burn',
      name: 'Burn Token',
      desc: 'Every transaction burns a % of tokens. Built-in deflationary mechanism.',
      fee: '2000 SOLT',
      icon: '🔥',
      path: '/burn-token'
    },
    {
      id: 'fee',
      name: 'Fee Token',
      desc: 'Collect transaction tax (Buy/Sell) for marketing, rewards, or liquidity.',
      fee: '2000 SOLT',
      icon: '💰',
      path: '/fee-token'
    }
  ];

  return (
    <div className="mint-page-container">
      <div className="mint-header">
        <h1>Solt<span>Hub</span> - Token Creator</h1>
      </div>

      <div className="selection-box">
        <p className="selection-title">Choose your token technology</p>
        
        <div className="token-type-list">
          {tokenTypes.map((token) => (
            <div key={token.id} className="token-type-row" onClick={() => navigate(token.path)}>
              <div className="token-icon-large">{token.icon}</div>
              <div className="token-details">
                <h3>{token.name}</h3>
                <p>{token.desc}</p>
                <span className="fee-text">Creation Fee: {token.fee}</span>
              </div>
              <button className="select-link">Select</button>
            </div>
          ))}
        </div>
      </div>

      <div className="mint-footer-note">
        <p>Verified Smart Contracts. Deployed on BSC Mainnet.</p>
        <span>Make sure you have enough SOLT for the service fee.</span>
      </div>
    </div>
  );
};

export default CreateToken;