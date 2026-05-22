import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
// 🔥 Connect Button jo aap copy karke laye ho, use yahan import kiya
import ConnectButton from '../components/ConnectButton'; 

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-dashboard">
      
      {/* 🔥 WALLET CONNECTION ROW: Aapke custom design ke upar button align karne ke liye code */}
      <div className="wallet-header-wrapper" style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 2rem 0 2rem', width: '100%' }}>
        <ConnectButton />
      </div>
      
      {/* --- MAIN HERO SECTION --- */}
      <div className="hero-cta-paragraph">
        <h1>All the DAPPs you Need to <span style={{ color: '#3b82f6' }}>Launch</span> a Successful Project</h1>
        <p>
          No coding required! Launch your project with the most secure and advanced project tools in the DeFi Space!
        </p>
      </div>

      {/* --- TOOLS & SERVICES SECTION --- */}
      <div className="analytics-section">
        <div className="analytics-grid">
          
          {/* 1. Create Token Card */}
          <div className="analytics-card">
            <span className="platform-icon">💰</span>
            <h3>Create Tokens</h3>
            <p>Mint your own BEP-20 tokens instantly with professional features.</p>
            <button className="view-chart-btn" onClick={() => navigate('/create')}>
              Get Started
            </button>
          </div>

          {/* 2. Create PreSale Card */}
          <div className="analytics-card">
            <span className="platform-icon">🚀</span>
            <h3>Create PreSale</h3>
            <p>Launch a professional presale with vesting and liquidity locks.</p>
            <button className="view-chart-btn" onClick={() => navigate('/create-presale')}>
              Get Started
            </button>
          </div>

          {/* 3. Create Locks Card - AB SAHI PATH PAR JAYEGA */}
          <div className="analytics-card">
            <span className="platform-icon">🔒</span>
            <h3>Create Locks</h3>
            <p>Secure liquidity and team tokens with automated lock schedules.</p>
            <button className="view-chart-btn" onClick={() => navigate('/create-lock')}>
              Get Started
            </button>
          </div>

          {/* 4. Airdrop Tokens Card - FUTURE USE KE LIYE ROUTE SET KIYA */}
          <div className="analytics-card">
            <span className="platform-icon">🪂</span>
            <h3>Airdrop Tokens</h3>
            <p>Distribute tokens to multiple wallets instantly in a single transaction.</p>
            <button className="view-chart-btn" onClick={() => navigate('/airdrop')}>
              Get Started
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Home;