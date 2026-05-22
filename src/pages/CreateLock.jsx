import React, { useState } from 'react';
import { ethers } from 'ethers';

// 1. Config (SOLT Token aur Lock Contract addresses)
const LOCK_CONTRACT_ADDRESS = "0xYourSoltLockContractAddressHere";
const SOLT_TOKEN_ADDRESS = "0xYourSoltTokenContractAddressHere"; // SOLT Contract Address yahan dalo
const SERVICE_FEE_AMOUNT = "30"; // 30 SOLT

const LOCK_ABI = [
  "function lockTokens(address token, uint256 amount, uint256 unlockTime) external", // 'payable' hata diya kyunki ab token fees hai
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)"
];

const CreateLock = () => {
  const [lockData, setLockData] = useState({
    tokenAddress: '',
    amount: '',
    lockTime: '365',
  });

  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [balance, setBalance] = useState('');

  const connectWallet = async () => {
    try {
      if (!window.ethereum) return alert("Please Install MetaMask!");
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWallet(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setLockData({ ...lockData, [name]: value });

    if (name === "tokenAddress" && value.length === 42) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tokenContract = new ethers.Contract(value, ERC20_ABI, provider);
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();

        if (wallet) {
          const rawBalance = await tokenContract.balanceOf(wallet);
          setBalance(Number(ethers.formatUnits(rawBalance, decimals)).toLocaleString());
        }
        setTokenSymbol(symbol);
      } catch (err) {
        setTokenSymbol('');
        setBalance('');
      }
    }
  };

  const handleLock = async () => {
    try {
      if (!wallet) return alert("Connect Wallet First!");
      if (!lockData.tokenAddress || !lockData.amount) return alert("Fill all fields!");
      
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Contracts setup
      const mainTokenContract = new ethers.Contract(lockData.tokenAddress, ERC20_ABI, signer);
      const soltTokenContract = new ethers.Contract(SOLT_TOKEN_ADDRESS, ERC20_ABI, signer);
      const lockContract = new ethers.Contract(LOCK_CONTRACT_ADDRESS, LOCK_ABI, signer);

      // Decimals aur Amounts setup
      const mainDecimals = await mainTokenContract.decimals();
      const soltDecimals = await soltTokenContract.decimals();
      
      const parsedLockAmount = ethers.parseUnits(lockData.amount, mainDecimals);
      const parsedFeeAmount = ethers.parseUnits(SERVICE_FEE_AMOUNT, soltDecimals);
      const unlockTime = Math.floor(Date.now() / 1000) + Number(lockData.lockTime) * 24 * 60 * 60;

      // STEP 1: Approve SOLT Fees (30 SOLT)
      console.log("Approving SOLT Fees...");
      const feeApproveTx = await soltTokenContract.approve(LOCK_CONTRACT_ADDRESS, parsedFeeAmount);
      await feeApproveTx.wait();

      // STEP 2: Approve Main Tokens to be locked
      console.log("Approving Main Tokens...");
      const mainApproveTx = await mainTokenContract.approve(LOCK_CONTRACT_ADDRESS, parsedLockAmount);
      await mainApproveTx.wait();

      // STEP 3: Create Lock (Contract logic handle karega SOLT transfer)
      console.log("Executing Lock...");
      const lockTx = await lockContract.lockTokens(
        lockData.tokenAddress, 
        parsedLockAmount, 
        unlockTime
      );
      await lockTx.wait();

      alert(`Tokens Locked Successfully! 30 SOLT Fees Paid.`);
    } catch (err) {
      console.error(err);
      alert(err.reason || "Transaction Failed - Check if you have enough SOLT for fees.");
    } finally {
      setLoading(false);
    }
  };

  const unlockDate = new Date(Date.now() + Number(lockData.lockTime) * 24 * 60 * 60 * 1000);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "34px", fontWeight: "bold" }}>
            Solt<span style={{ color: "#fbbf24" }}>Lock</span>
          </h1>
          <p style={{ color: "#94a3b8" }}>Secure your liquidity & team tokens</p>
        </div>

        {!wallet ? (
          <button onClick={connectWallet} style={buttonStyle}>CONNECT WALLET</button>
        ) : (
          <div style={statusBoxStyle}>
            🟢 Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </div>
        )}

        <div style={{ marginBottom: "20px", marginTop: "20px" }}>
          <label style={labelStyle}>Token Address</label>
          <input type="text" name="tokenAddress" value={lockData.tokenAddress} onChange={handleInputChange} placeholder="0x..." style={inputStyle} />
        </div>

        {tokenSymbol && (
          <div style={infoBoxStyle}>
            <p><strong>Token:</strong> {tokenSymbol}</p>
            <p><strong>Your Balance:</strong> {balance} {tokenSymbol}</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>Amount</label>
            <input type="text" name="amount" value={lockData.amount} onChange={handleInputChange} placeholder="1000000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Lock Duration</label>
            <select name="lockTime" value={lockData.lockTime} onChange={handleInputChange} style={inputStyle}>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="180">180 Days</option>
              <option value="365">365 Days</option>
            </select>
          </div>
        </div>

        {/* Updated Fee Display Section */}
        <div style={feeBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span>Service Fee:</span>
            <span style={{ color: "#fbbf24", fontWeight: "bold" }}>30 SOLT</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #ffffff11", paddingTop: "10px" }}>
            <span>Unlock Date:</span>
            <span>{unlockDate.toLocaleDateString()}</span>
          </div>
        </div>

        <button onClick={handleLock} disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.6 : 1, marginTop: "10px" }}>
          {loading ? "PROCESSING TRANSACTIONS..." : "CREATE LOCK"}
        </button>

        <p style={noteStyle}>
          Note: You need 30 SOLT tokens in your wallet to pay for the locking fee.
        </p>

      </div>
    </div>
  );
};

// Styles (Aapki metallic/dark theme)
const containerStyle = { minHeight: "100vh", background: "#081120", padding: "40px 20px", color: "white" };
const cardStyle = { maxWidth: "650px", margin: "0 auto", background: "#111b33", padding: "30px", borderRadius: "18px", border: "1px solid #22345f", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" };
const inputStyle = { width: "100%", padding: "14px", borderRadius: "10px", background: "#0a1120", border: "1px solid #22345f", color: "white", outline: "none" };
const labelStyle = { display: "block", marginBottom: "8px", color: "#60a5fa", fontSize: "14px", fontWeight: "600" };
const buttonStyle = { width: "100%", padding: "15px", border: "none", borderRadius: "10px", background: "linear-gradient(90deg,#fbbf24,#f59e0b)", color: "black", fontWeight: "bold", fontSize: "16px", cursor: "pointer" };
const statusBoxStyle = { background: "#0f172a", padding: "12px", borderRadius: "10px", border: "1px solid #1e293b", textAlign: "center", fontSize: "14px", color: "#10b981" };
const infoBoxStyle = { marginBottom: "20px", background: "rgba(59, 130, 246, 0.1)", padding: "15px", borderRadius: "10px", border: "1px solid rgba(59, 130, 246, 0.2)", fontSize: "14px" };
const feeBoxStyle = { marginBottom: "20px", background: "#172554", padding: "15px", borderRadius: "10px", color: "#bfdbfe", fontSize: "14px" };
const noteStyle = { marginTop: "20px", fontSize: "12px", color: "#94a3b8", textAlign: "center", fontStyle: "italic" };

export default CreateLock;