import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

// --- Configuration ---
const AIRDROP_CONTRACT_ADDRESS = "0xYourAirdropContractAddress";
const SOLT_TOKEN_ADDRESS = "0xYourSoltTokenAddress"; 
const SOLT_FEE_AMOUNT = "30"; // 30 SOLT Fee

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)"
];

const Airdrop = () => {
  const [dropType, setDropType] = useState("Native");
  const [listInput, setListInput] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- Logic: Calculate total amount from textarea ---
  useEffect(() => {
    const lines = listInput.split("\n");
    let sum = 0;
    lines.forEach((line) => {
      const parts = line.split(",");
      if (parts.length === 2) {
        const val = parseFloat(parts[1].trim());
        if (!isNaN(val)) sum += val;
      }
    });
    setTotalAmount(sum);
  }, [listInput]);

  const handleAirdrop = async () => {
    if (!listInput) return alert("Please enter recipient list!");
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // STEP 1: SOLT FEE APPROVAL (30 SOLT)
      const soltContract = new ethers.Contract(SOLT_TOKEN_ADDRESS, ERC20_ABI, signer);
      const feeUnits = ethers.parseUnits(SOLT_FEE_AMOUNT, 18);
      
      console.log("Approving 30 SOLT Fees...");
      const feeTx = await soltContract.approve(AIRDROP_CONTRACT_ADDRESS, feeUnits);
      await feeTx.wait();

      // STEP 2: AIRDROP LOGIC
      // Yahan aap apna multi-send function call kar sakte hain
      alert("Fees Approved! Proceeding with Airdrop...");
      
    } catch (err) {
      console.error(err);
      alert("Transaction Failed! Make sure you have 30 SOLT for fees.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Welcome to <span style={{ color: "#a855f7" }}>SoltDrop</span></h1>

      {/* --- STEP 1: SELECT TYPE --- */}
      <div style={stepCard}>
        <div style={stepHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={stepNum}>1</span>
            <h3 style={{ margin: 0 }}>Select the Airdrop Type</h3>
          </div>
          <span style={{ color: "#4ade80" }}>✔</span>
        </div>

        <div style={{ padding: "15px" }}>
          <div
            style={{ ...typeRow, border: dropType === "Native" ? "1px solid #a855f7" : "1px solid #1e2d4d" }}
            onClick={() => setDropType("Native")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>🌐</span>
              <h4 style={{ margin: 0 }}>Airdrop <span style={{ color: "#60a5fa" }}>Native Tokens</span></h4>
            </div>
            <button style={dropType === "Native" ? selectedBtn : selectBtn}>
              {dropType === "Native" ? "Selected" : "Select"}
            </button>
          </div>

          <div
            style={{ ...typeRow, border: dropType === "Custom" ? "1px solid #a855f7" : "1px solid #1e2d4d" }}
            onClick={() => setDropType("Custom")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>💎</span>
              <h4 style={{ margin: 0 }}>Airdrop <span style={{ color: "#60a5fa" }}>Custom Tokens</span></h4>
            </div>
            <button style={dropType === "Custom" ? selectedBtn : selectBtn}>
              {dropType === "Custom" ? "Selected" : "Select"}
            </button>
          </div>
        </div>
      </div>

      {/* --- INSTRUCTIONS SECTION --- */}
      <h3 style={{ textAlign: "center", marginTop: "30px" }}>Airdrop Instructions</h3>
      <div style={instructionGrid}>
        <div style={instItem}>✔ Airdrop tokens to as many users as desired</div>
        <div style={instItem}>✔ Enter your token address first</div>
        <div style={instItem}>✔ Make sure you have enough tokens</div>
        <div style={instItem}>✔ Recommended max 250 addresses at a time</div>
      </div>

      {/* --- STEP 2: ADDRESS INPUT --- */}
      <div style={stepCard}>
        <div style={stepHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={stepNum}>2</span>
            <h3 style={{ margin: 0 }}>Set up the Airdrop Options</h3>
          </div>
        </div>
        <div style={{ padding: "20px" }}>
          <p style={{ fontSize: "14px", color: "#94a3b8" }}>Enter a list of users followed by amount (comma separated)</p>
          <textarea
            placeholder="Ex: 0x000...000, 100"
            style={textAreaStyle}
            value={listInput}
            onChange={(e) => setListInput(e.target.value)}
          />
          
          <div style={amountBox}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span>Total Airdrop:</span>
              <span style={{ color: "#60a5fa" }}>{totalAmount} Tokens</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#fbbf24" }}>
              <span>Service Fee:</span>
              <span>30 SOLT</span>
            </div>
          </div>

          <button 
            onClick={handleAirdrop} 
            disabled={loading}
            style={{ 
                ...dropBtn, 
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#334155" : "linear-gradient(90deg, #a855f7, #7c3aed)",
                color: "white" 
            }}
          >
            {loading ? "PROCESSING..." : "AIRDROP TOKENS"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Styles (DxDrop Style) ---
const containerStyle = { maxWidth: "800px", margin: "40px auto", padding: "0 20px", color: "white" };
const titleStyle = { textAlign: "center", fontSize: "36px", marginBottom: "40px" };
const stepCard = { background: "#111b33", borderRadius: "12px", marginBottom: "20px", border: "1px solid #1e2d4d", overflow: "hidden" };
const stepHeader = { background: "#1e2d4d", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const stepNum = { background: "#60a5fa", color: "#000", width: "24px", height: "24px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", fontSize: "14px" };
const typeRow = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", borderRadius: "10px", marginBottom: "10px", cursor: "pointer" };
const selectBtn = { background: "transparent", border: "1px solid #334155", color: "#60a5fa", padding: "6px 15px", borderRadius: "20px", cursor: "pointer" };
const selectedBtn = { background: "transparent", border: "1px solid #4ade80", color: "#4ade80", padding: "6px 15px", borderRadius: "20px" };
const instructionGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "20px 0", fontSize: "13px", color: "#94a3b8" };
const instItem = { background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "5px" };
const textAreaStyle = { width: "100%", height: "120px", background: "#0b1426", border: "1px solid #1e2d4d", borderRadius: "8px", color: "#fff", padding: "10px", marginTop: "10px", outline: "none", resize: "none" };
const amountBox = { background: "#1e2d4d", padding: "15px", borderRadius: "8px", marginTop: "15px", fontSize: "14px" };
const dropBtn = { width: "100%", border: "none", padding: "15px", borderRadius: "8px", fontWeight: "bold", marginTop: "20px" };

export default Airdrop;