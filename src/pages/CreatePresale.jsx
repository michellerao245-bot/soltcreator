import React, { useState } from "react";
import { ethers } from "ethers";
import { EMPIRE_CONFIG } from "../utils/EmpireBridge"; // Central Bridge Link
import "./CreatePresale.css";

const CreatePresale = () => {
  const [step, setStep] = useState(1);
  const [launchType, setLaunchType] = useState("Presale");
  const [loading, setLoading] = useState(false);

  // Fees logic - Fees fixed as per ecosystem standards
  const launchTypes = [
    { id: "Presale", name: "Presale", icon: "🚀", desc: "Standard presale with caps.", fee: "2000 SOLT" },
    { id: "Fairlaunch", name: "Fairlaunch", icon: "📈", desc: "Price discovered by demand.", fee: "2500 SOLT" },
    { id: "Overflow", name: "Overflow", icon: "📊", desc: "Proportional token distribution.", fee: "3000 SOLT" },
    { id: "Private", name: "Private Sale", icon: "🔒", desc: "Whitelist only early access.", fee: "1500 SOLT" },
  ];

  const selectedFee = launchTypes.find(t => t.id === launchType)?.fee;

  // --- BLOCKCHAIN LAUNCH LOGIC ---
  const handleLaunch = async () => {
    if (!window.ethereum) {
        alert("Bhai, MetaMask install kar lo pehle!");
        return;
    }

    setLoading(true);
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // Bridge se data uthana
        const feeEngine = EMPIRE_CONFIG.contracts.feeEngine; 
        const soltToken = EMPIRE_CONFIG.contracts.soltToken;

        console.log("Fees Collector:", feeEngine);
        console.log("Token for Fees:", soltToken);

        // TODO: Smart Contract Call Logic here (Approve & Create)
        // Example: await tokenContract.approve(feeEngine, feeAmount);
        
        alert(`${launchType} launch process initiated! Fees will go to: ${feeEngine}`);
        
    } catch (error) {
        console.error("Launch Error:", error);
        alert("Transaction fail ho gayi!");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="presale-container">
      <div className="presale-card">
        <div className="stage-badge">Step {step}: {step === 1 ? "Launch Type" : "Form Details"}</div>
        
        {step === 1 ? (
          <div className="selection-area">
            <h2 style={{ color: "white", marginBottom: "20px" }}>Select Launch Type</h2>
            {launchTypes.map((type) => (
              <div
                key={type.id}
                className={`price-box ${launchType === type.id ? "active-type" : ""}`}
                onClick={() => setLaunchType(type.id)}
                style={{
                  border: launchType === type.id ? "2px solid #d4af37" : "1px solid #333",
                  cursor: "pointer",
                  background: launchType === type.id ? "rgba(212, 175, 55, 0.1)" : "#222",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "15px", textAlign: "left" }}>
                  <span style={{ fontSize: "24px" }}>{type.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, color: launchType === type.id ? "#d4af37" : "#fff" }}>{type.name}</h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>{type.desc}</p>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#d4af37", background: "#000", padding: "4px 8px", borderRadius: "5px" }}>
                    {type.fee}
                  </div>
                </div>
              </div>
            ))}
            <button className="buy-btn" style={{ marginTop: "20px" }} onClick={() => setStep(2)}>
              Continue to {launchType} Form
            </button>
          </div>
        ) : (
          <div className="input-area">
            <h3 style={{ color: "#d4af37", marginBottom: "20px" }}>{launchType} Information</h3>
            
            <div className="input-group">
              <label>Token Contract Address</label>
              <input type="text" placeholder="0x..." />
            </div>

            {launchType === "Presale" && (
              <>
                <div className="input-group">
                  <label>Presale Rate (1 BNB = ? Tokens)</label>
                  <input type="number" placeholder="1000" />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div className="input-group">
                    <label>Softcap (BNB)</label>
                    <input type="number" placeholder="10" />
                  </div>
                  <div className="input-group">
                    <label>Hardcap (BNB)</label>
                    <input type="number" placeholder="20" />
                  </div>
                </div>
              </>
            )}

            {launchType === "Fairlaunch" && (
              <div className="input-group">
                <label>Total Tokens to Sell</label>
                <input type="number" placeholder="1,000,000" />
              </div>
            )}

            {/* Total Fee Summary - Connected to EmpireBridge */}
            <div className="price-box" style={{ border: "1px dashed #d4af37", marginTop: "20px", background: "rgba(212, 175, 55, 0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#ccc" }}>
                    <span>Service Fee:</span>
                    <span style={{ color: "#d4af37", fontWeight: "bold" }}>{selectedFee}</span>
                </div>
                <p className="inr-text" style={{ fontSize: "10px", marginTop: "5px" }}>
                    *Fees will be sent to FeeEngine: {EMPIRE_CONFIG.contracts.feeEngine.slice(0,6)}...{EMPIRE_CONFIG.contracts.feeEngine.slice(-4)}
                </p>
            </div>

            <button 
                className="buy-btn" 
                style={{ marginTop: "15px" }} 
                onClick={handleLaunch}
                disabled={loading}
            >
              {loading ? "Processing..." : `Approve & Launch ${launchType}`}
            </button>
            
            <p className="status-msg" onClick={() => setStep(1)} style={{ cursor: "pointer", fontSize: "14px", marginTop: "15px" }}>
              ← Back to Selection
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePresale;