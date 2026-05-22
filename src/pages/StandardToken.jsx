import React, { useState } from 'react';
import { ethers } from 'ethers';
import FACTORY_ABI from '../contractABI.json';

const StandardToken = () => {
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    supply: '',
    decimals: 18
  });

  const FACTORY_ADDRESS = "0xc8fBBfa8172D3FF165889259C3a02eC5a5Cc3a18";
  const SOLT_TOKEN_ADDRESS = "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";

  const handleDeploy = async (e) => {
    e.preventDefault();

    if (!window.ethereum) {
      return alert("MetaMask not detected. Please use MetaMask Browser on mobile.");
    }

    try {
      setLoading(true);

      // 1. Connect & Check Network
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const network = await provider.getNetwork();
      if (network.chainId !== 56n) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }],
        });
      }

      // ========================= 
      // STEP 1: APPROVE SOLT 
      // ========================= 
      const solt = new ethers.Contract(
        SOLT_TOKEN_ADDRESS,
        ["function approve(address spender, uint256 amount) returns (bool)"],
        signer
      );

      console.log("🚀 Initiating Step 1: Approval...");
      const approveTx = await solt.approve(
        FACTORY_ADDRESS,
        ethers.parseUnits("2000", 18)
      );

      alert("Step 1: Approval Successful! Please wait 5 seconds for the Deployment popup...");
      await approveTx.wait();

      // 🔥 CRITICAL DELAY: This ensures the 2nd popup triggers on Laptop & Mobile
      await new Promise(resolve => setTimeout(resolve, 5000));

      // ========================= 
      // STEP 2: DEPLOY TOKEN 
      // ========================= 
      const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI,
        signer
      );

      const supply = formData.supply;
      const decimals = Number(formData.decimals || 18);

      if (Number(supply) <= 0) {
        setLoading(false);
        return alert("Supply must be greater than 0");
      }

      console.log("🚀 Initiating Step 2: Deployment...");
      // Using parseUnits for supply to handle large numbers correctly
      const supplyWei = ethers.parseUnits(supply.toString(), decimals);

      const tx = await factory.createStandardToken(
        formData.name,
        formData.symbol,
        supplyWei,
        decimals
      );

      console.log("Transaction Hash:", tx.hash);
      const receipt = await tx.wait();

      // Extract Token Address
      const event = receipt.logs.find(log => {
        try {
          return log.fragment?.name === "TokenCreated";
        } catch { return false; }
      });

      if (event) {
        const deployedAddress = event.args.token;
        setTokenAddress(deployedAddress);
        
        window.open(`https://bscscan.com/verifyContract?a=${deployedAddress}`, "_blank");
        alert("🎉 Congratulations! Token Deployed Successfully:\n" + deployedAddress);
      }

      setFormData({ name: '', symbol: '', supply: '', decimals: 18 });

    } catch (err) {
      console.error(err);
      if (err.code === 4001) {
        alert("Transaction rejected by user.");
      } else {
        alert("Error: " + (err.reason || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🚀 Standard Token Deployer</h2>

        <form onSubmit={handleDeploy}>
          <input
            style={styles.input}
            placeholder="Token Name"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="Token Symbol"
            value={formData.symbol}
            onChange={e => setFormData({ ...formData, symbol: e.target.value })}
            required
          />
          <input
            style={styles.input}
            type="number"
            placeholder="Total Supply"
            value={formData.supply}
            onChange={e => setFormData({ ...formData, supply: e.target.value })}
            required
          />
          <input
            style={styles.input}
            type="number"
            placeholder="Decimals (Default: 18)"
            value={formData.decimals}
            onChange={e => setFormData({ ...formData, decimals: e.target.value })}
          />

          <button style={styles.button} disabled={loading}>
            {loading ? "⏳ Processing... Please Wait" : "Deploy Token"}
          </button>
        </form>

        <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '15px', lineHeight: '1.4' }}>
          <b>Note:</b> After confirming the first transaction, please wait 5-10 seconds for the deployment window to trigger automatically.
        </p>

        {tokenAddress && (
          <div style={styles.result}>
            <p style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>✅ Token Deployed Successfully:</p>
            <p style={{ wordBreak: "break-all", fontSize: '12px', color: '#cbd5e1' }}>{tokenAddress}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#020617", color: "#fff", fontFamily: "'Inter', sans-serif" },
  card: { background: "#0f172a", padding: "30px", borderRadius: "16px", width: "360px", border: "1px solid #1e293b", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" },
  title: { textAlign: "center", marginBottom: "25px", fontSize: '22px', fontWeight: 'bold' },
  input: { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #334155", background: "#020617", color: "#fff", outline: "none", boxSizing: 'border-box' },
  button: { width: "100%", padding: "14px", background: "linear-gradient(90deg, #3b82f6, #06b6d4)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  result: { marginTop: "20px", background: "#020617", padding: "12px", borderRadius: "8px", border: "1px dashed #22c55e" }
};

export default StandardToken;