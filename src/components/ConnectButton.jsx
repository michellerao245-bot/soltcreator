import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

const ConnectButton = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // 🔥 100% WORKING FORCE DISCONNECT HANDLER
  const handleDisconnect = async () => {
    try {
      // 1. Wagmi ka disconnect call karein
      await disconnect();
      
      // 2. MetaMask/WalletConnect ke bache-kuche local cache ko clear karein
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.wallet');
      localStorage.removeItem('wagmi.store');
      
      // 3. Poore page ko force reload karein taaki fresh state load ho
      window.location.reload();
    } catch (error) {
      console.error("Disconnect failed:", error);
      // Fallback reload agar koi error aaye toh bhi
      window.location.reload();
    }
  };

  // 1. JAB WALLET CONNECTED NAHI HAI
  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        style={{
          background: '#facc15',
          color: '#000000',
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '10px 22px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 0 15px rgba(250, 204, 21, 0.3)',
          transition: 'all 0.2s ease',
          fontSize: '14px'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#eab308'}
        onMouseOut={(e) => e.currentTarget.style.background = '#facc15'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3" />
          <path d="M3 11v3c0 1.1.9 2 2 2h1" />
        </svg>
        Connect Wallet
      </button>
    );
  }

  // 2. JAB WALLET CONNECTED HAI (Exact Matching Image Layout)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      
      {/* Exact Matching Light Blue/Teal Address Box */}
      <div 
        style={{
          background: '#6ce3e8', // Wahi dynamic light teal shade jo aapki image me hai
          color: '#1a2233',      // Text color inside the chip
          fontWeight: '700',
          padding: '10px 18px',
          borderRadius: '25px',  // Capsule layout
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          boxShadow: '0 2px 10px rgba(108, 227, 232, 0.2)',
          border: 'none'
        }}
      >
        {/* Wallet Micro Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        {formatAddress(address)}
      </div>

      {/* Solid Orange/Red Disconnect Button */}
      <button
        onClick={handleDisconnect}
        style={{
          background: '#e0684f', // Solid matching orange-red palette from image
          color: '#ffffff',
          fontWeight: '700',
          padding: '10px 18px',
          borderRadius: '25px',  // Matching capsule style
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
          fontSize: '13px',
          boxShadow: '0 2px 10px rgba(224, 104, 79, 0.2)'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#cd573f'}
        onMouseOut={(e) => e.currentTarget.style.background = '#e0684f'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Disconnect
      </button>

    </div>
  );
};

export default ConnectButton;