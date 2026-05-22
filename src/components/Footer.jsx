import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();

  const footerStyles = {
    container: {
      background: "#0b1426",
      padding: "60px 20px 30px 20px",
      borderTop: "1px solid rgba(59, 130, 246, 0.1)",
      width: "100%",
      boxSizing: "border-box",
      marginTop: "auto",
      position: "relative"
    },
    grid: {
      display: "flex",
      justifyContent: "space-between",
      maxWidth: "1100px",
      margin: "0 auto",
      flexWrap: "wrap",
      textAlign: "left"
    },
    col: {
      minWidth: "180px",
      marginBottom: "30px",
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    },
    h4: {
      color: "#f59e0b",
      fontSize: "14px",
      fontWeight: "bold",
      marginBottom: "16px",
      textTransform: "uppercase",
      letterSpacing: "1px"
    },
    linkButton: {
      background: "none",
      border: "none",
      color: "#94a3b8",
      fontSize: "14px",
      padding: "6px 0",
      textAlign: "left",
      cursor: "pointer",
      transition: "all 0.2s ease-in-out",
      width: "fit-content",
      outline: "none",
      display: "block"
    },
    hr: { border: "0", borderTop: "1px solid rgba(255, 255, 255, 0.05)", margin: "30px auto", maxWidth: "1100px" },
    socialLink: {
      color: "#94a3b8",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      textDecoration: "none",
      transition: "all 0.2s ease",
      cursor: "pointer"
    },
    highlightText: {
      fontSize: "14px",
      color: "#22d3ee",
      fontWeight: "600",
      textAlign: "center",
      marginTop: "20px",
      letterSpacing: "0.5px",
      textShadow: "0 0 10px rgba(34, 211, 238, 0.3)",
      fontFamily: "sans-serif"
    }
  };

  const handleSocialEnter = (e) => {
    e.currentTarget.style.color = "#22d3ee";
    e.currentTarget.style.transform = "scale(1.15)";
  };

  const handleSocialLeave = (e) => {
    e.currentTarget.style.color = "#94a3b8";
    e.currentTarget.style.transform = "scale(1)";
  };

  const handleButtonEnter = (e) => {
    e.currentTarget.style.color = "#22d3ee";
    e.currentTarget.style.paddingLeft = "6px";
    e.currentTarget.style.textShadow = "0 0 8px rgba(34, 211, 238, 0.6)";
  };

  const handleButtonLeave = (e) => {
    e.currentTarget.style.color = "#94a3b8";
    e.currentTarget.style.paddingLeft = "0";
    e.currentTarget.style.textShadow = "none";
  };

  // 🚀 Fixed Click Routing Engine
  const handleLinkClick = (itemName) => {
    console.log(`Navigating to ${itemName} action/route`);
   
    if (itemName === 'Terms of Use') {
      navigate('/terms');
    }
   
    if (itemName === 'Private Policy') {
      navigate('/privacy');
    }

    if (itemName === 'Marketing Service') {
      navigate('/marketing');
    }

    // 📚 NAYA ADDITION: Documentation link mapping safely integrated here
    if (itemName === 'Documentation') {
      navigate('/documentation');
    }

    // 💬 NEW DISCORD LINK REDIRECTION WITH BYPASS wrapper
    if (itemName === 'Support Chat') {
      const secureWindow = window.open('https://discordapp.com/invite/ru3haKpN8', '_blank', 'noopener,noreferrer');
      if (secureWindow) secureWindow.opener = null;
    }
  };

  return (
    <footer style={footerStyles.container}>
      <div style={footerStyles.grid}>
       
        {/* PRODUCTS COLUMN */}
        <div style={footerStyles.col}>
          <h4 style={footerStyles.h4}>Products</h4>
          {['SoltMint', 'SoltSale', 'SoltLock', 'SoltDrop'].map((item) => (
            <button
              key={item}
              style={footerStyles.linkButton}
              onMouseEnter={handleButtonEnter}
              onMouseLeave={handleButtonLeave}
              onClick={() => handleLinkClick(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {/* COMPANY COLUMN */}
        <div style={footerStyles.col}>
          <h4 style={footerStyles.h4}>Company</h4>
          {['Our Story', 'Press Kit', 'Terms of Use', 'Private Policy'].map((item) => (
            <button
              key={item}
              style={footerStyles.linkButton}
              onMouseEnter={handleButtonEnter}
              onMouseLeave={handleButtonLeave}
              onClick={() => handleLinkClick(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {/* RESOURCES COLUMN */}
        <div style={footerStyles.col}>
          <h4 style={footerStyles.h4}>Resources</h4>
          {['Documentation', 'Support Chat', 'Marketing Service'].map((item) => (
            <button
              key={item}
              style={footerStyles.linkButton}
              onMouseEnter={handleButtonEnter}
              onMouseLeave={handleButtonLeave}
              onClick={() => handleLinkClick(item)}
            >
              {item}
            </button>
          ))}
        </div>

      </div>

      <hr style={footerStyles.hr} />

      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "25px", flexWrap: "wrap", marginBottom: "25px" }}>
         
          {/* Twitter / X */}
          <a href="https://x.com/TeamSoltcoin" target="_blank" rel="noreferrer" title="Twitter" style={footerStyles.socialLink} onMouseEnter={handleSocialEnter} onMouseLeave={handleSocialLeave}>
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>

          {/* Discord Icon - NEW LINK UPDATED HERE AS WELL */}
          <a href="https://discordapp.com/invite/ru3haKpN8" target="_blank" rel="noopener noreferrer" title="Discord" style={footerStyles.socialLink} onMouseEnter={handleSocialEnter} onMouseLeave={handleSocialLeave}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.298 12.298 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
            </svg>
          </a>

          {/* Telegram */}
          <a href="https://t.me/AurionCoin" target="_blank" rel="noreferrer" title="Telegram" style={footerStyles.socialLink} onMouseEnter={handleSocialEnter} onMouseLeave={handleSocialLeave}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 12 10 12-4.48 12-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.62.15-.15 2.7-2.48 2.75-2.7.01-.03.01-.14-.05-.2-.06-.06-.16-.04-.23-.03-.1.02-1.69 1.07-4.77 3.15-.45.3-.86.46-1.23.45-.41-.01-1.2-.23-1.79-.42-.72-.23-1.29-.35-1.24-.75.03-.21.32-.42.87-.64 3.39-1.48 5.66-2.46 6.79-2.93 3.23-1.35 3.9-1.59 4.34-1.59.1 0 .31.02.45.14.12.1.15.24.17.34.02.1.03.22.01.33z"/>
            </svg>
          </a>

          {/* LinkedIn */}
          <a href="https://www.linkedin.com/in/johnny-rao-2590593b1?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" title="LinkedIn" style={footerStyles.socialLink} onMouseEnter={handleSocialEnter} onMouseLeave={handleSocialLeave}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
          </a>

          {/* Facebook */}
          <a href="https://www.facebook.com/share/1DkwdBsQz1/" target="_blank" rel="noreferrer" title="Facebook" style={footerStyles.socialLink} onMouseEnter={handleSocialEnter} onMouseLeave={handleSocialLeave}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.85z"/>
            </svg>
          </a>

          {/* Website */}
          <a href="https://soltchain.com" target="_blank" rel="noreferrer" title="Website" style={footerStyles.socialLink} onMouseEnter={handleSocialEnter} onMouseLeave={handleSocialLeave}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 12 10 12-4.48 12-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </a>

        </div>
       
        <p style={footerStyles.highlightText}>
          © 2026 Soltchain Technologies. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;