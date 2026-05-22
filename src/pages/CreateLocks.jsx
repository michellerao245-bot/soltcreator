import React, { useState } from 'react';
import { ethers } from 'ethers';

const LOCK_CONTRACT_ADDRESS = "YOUR_LOCK_CONTRACT_ADDRESS";

// Minimal Lock Contract ABI
const LOCK_ABI = [
  "function lockTokens(address token, uint256 amount, uint256 unlockTime) external",
];

// Minimal ERC20 ABI
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

  // Wallet Connect
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Install MetaMask");
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      setWallet(accounts[0]);

      const provider = new ethers.BrowserProvider(window.ethereum);

      console.log("Wallet Connected");
    } catch (err) {
      console.error(err);
    }
  };

  // Input Change
  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    setLockData({
      ...lockData,
      [name]: value,
    });

    // Auto fetch token info
    if (name === "tokenAddress" && value.length === 42) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);

        const tokenContract = new ethers.Contract(
          value,
          ERC20_ABI,
          provider
        );

        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();

        if (wallet) {
          const rawBalance = await tokenContract.balanceOf(wallet);

          const formattedBalance = ethers.formatUnits(
            rawBalance,
            decimals
          );

          setBalance(Number(formattedBalance).toLocaleString());
        }

        setTokenSymbol(symbol);

      } catch (err) {
        console.log("Invalid Token");
        setTokenSymbol('');
        setBalance('');
      }
    }
  };

  // Create Lock
  const handleLock = async () => {
    try {
      if (!wallet) {
        alert("Connect Wallet First");
        return;
      }

      if (!lockData.tokenAddress || !lockData.amount) {
        alert("Fill all fields");
        return;
      }

      // Address Validation
      if (!/^0x[a-fA-F0-9]{40}$/.test(lockData.tokenAddress)) {
        alert("Invalid Token Address");
        return;
      }

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);

      const signer = await provider.getSigner();

      // Token Contract
      const tokenContract = new ethers.Contract(
        lockData.tokenAddress,
        ERC20_ABI,
        signer
      );

      // Lock Contract
      const lockContract = new ethers.Contract(
        LOCK_CONTRACT_ADDRESS,
        LOCK_ABI,
        signer
      );

      // Token Decimals
      const decimals = await tokenContract.decimals();

      // Convert Amount
      const parsedAmount = ethers.parseUnits(
        lockData.amount,
        decimals
      );

      // Unlock Timestamp
      const unlockTime =
        Math.floor(Date.now() / 1000) +
        Number(lockData.lockTime) * 24 * 60 * 60;

      // STEP 1 — Approve
      const approveTx = await tokenContract.approve(
        LOCK_CONTRACT_ADDRESS,
        parsedAmount
      );

      await approveTx.wait();

      // STEP 2 — Lock Tokens
      const lockTx = await lockContract.lockTokens(
        lockData.tokenAddress,
        parsedAmount,
        unlockTime
      );

      await lockTx.wait();

      alert("Tokens Locked Successfully!");

      console.log("LOCK TX:", lockTx.hash);

    } catch (err) {
      console.error(err);

      if (err.reason) {
        alert(err.reason);
      } else {
        alert("Transaction Failed");
      }

    } finally {
      setLoading(false);
    }
  };

  // Unlock Date Preview
  const unlockDate = new Date(
    Date.now() + Number(lockData.lockTime) * 24 * 60 * 60 * 1000
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#081120",
        padding: "40px 20px",
        color: "white",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "#111b33",
          padding: "30px",
          borderRadius: "18px",
          border: "1px solid #22345f",
        }}
      >

        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "34px" }}>
            Solt<span style={{ color: "#fbbf24" }}>Lock</span>
          </h1>

          <p style={{ color: "#94a3b8" }}>
            Secure your liquidity & team tokens
          </p>
        </div>

        {/* CONNECT */}
        {!wallet ? (
          <button
            onClick={connectWallet}
            style={buttonStyle}
          >
            CONNECT WALLET
          </button>
        ) : (
          <div
            style={{
              marginBottom: "20px",
              background: "#0f172a",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #1e293b",
              textAlign: "center",
            }}
          >
            Connected:
            <br />
            {wallet.slice(0, 6)}...
            {wallet.slice(wallet.length - 4)}
          </div>
        )}

        {/* TOKEN ADDRESS */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>
            Token Address
          </label>

          <input
            type="text"
            name="tokenAddress"
            value={lockData.tokenAddress}
            onChange={handleInputChange}
            placeholder="0x..."
            style={inputStyle}
          />
        </div>

        {/* TOKEN INFO */}
        {tokenSymbol && (
          <div
            style={{
              marginBottom: "20px",
              background: "#0f172a",
              padding: "15px",
              borderRadius: "10px",
            }}
          >
            <p>Token: {tokenSymbol}</p>
            <p>Balance: {balance}</p>
          </div>
        )}

        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >

          {/* AMOUNT */}
          <div>
            <label style={labelStyle}>
              Amount
            </label>

            <input
              type="text"
              name="amount"
              value={lockData.amount}
              onChange={handleInputChange}
              placeholder="1000000"
              style={inputStyle}
            />
          </div>

          {/* LOCK TIME */}
          <div>
            <label style={labelStyle}>
              Lock Duration
            </label>

            <select
              name="lockTime"
              value={lockData.lockTime}
              onChange={handleInputChange}
              style={inputStyle}
            >
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="180">180 Days</option>
              <option value="365">365 Days</option>
            </select>
          </div>
        </div>

        {/* UNLOCK DATE */}
        <div
          style={{
            marginBottom: "20px",
            background: "#172554",
            padding: "15px",
            borderRadius: "10px",
            color: "#bfdbfe",
          }}
        >
          Unlock Date:
          <br />
          {unlockDate.toLocaleString()}
        </div>

        {/* BUTTON */}
        <button
          onClick={handleLock}
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "LOCKING..." : "CREATE LOCK"}
        </button>

        {/* NOTE */}
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "10px",
            background: "#1e293b",
            fontSize: "13px",
            color: "#94a3b8",
            lineHeight: "22px",
          }}
        >
          Once locked, tokens cannot be withdrawn
          before unlock date.
        </div>

      </div>
    </div>
  );
};

// STYLES
const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  background: "#0a1120",
  border: "1px solid #22345f",
  color: "white",
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: "10px",
  color: "#60a5fa",
};

const buttonStyle = {
  width: "100%",
  padding: "15px",
  border: "none",
  borderRadius: "10px",
  background: "linear-gradient(90deg,#fbbf24,#f59e0b)",
  color: "black",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
};

export default CreateLock;