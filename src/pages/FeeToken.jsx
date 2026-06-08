import React, { useState } from 'react';
import { ethers } from 'ethers';
import FACTORY_ABI from '../contractABI.json';

const FeeToken = () => {
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [deployMessage, setDeployMessage] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    supply: '',
    decimals: 18,
    tax: '' // Tax field added
  });

  const FACTORY_ADDRESS = "0xc8fBBfa8172D3FF165889259C3a02eC5a5Cc3a18";
  const SOLT_TOKEN_ADDRESS = "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";
  const FEE_AMOUNT = "2000"; 

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    if (!window.ethereum) return alert("MetaMask not detected.");

    try {
      setLoading(true);
      setDeployMessage("🚀 Preparing Fee Token deployment...");
      setTokenAddress("");

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // 1. Approve Fee
      setDeployMessage("⏳ Approving 2000 SOLT fee...");
      const solt = new ethers.Contract(
        SOLT_TOKEN_ADDRESS,
        ["function approve(address spender, uint256 amount) returns (bool)"],
        signer
      );
      
      const approveTx = await solt.approve(FACTORY_ADDRESS, ethers.parseUnits(FEE_AMOUNT, 18));
      await approveTx.wait();

      // 2. Deploy Fee Token
      setDeployMessage("⏳ Deploying Fee Token...");
      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      const tx = await factory.createFeeToken(
        formData.name,
        formData.symbol,
        BigInt(formData.supply),
        Number(formData.decimals),
        BigInt(formData.tax) // Tax passed here
      );

      const receipt = await tx.wait();

      // 3. Extract Address
      let deployedAddress = null;
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed && parsed.name === "TokenCreated") {
            deployedAddress = parsed.args.token;
            break;
          }
        } catch (e) { continue; }
      }

      setTokenAddress(deployedAddress);
      setDeployMessage("✅ Fee Token Deployed Successfully!");
      setFormData({ name: '', symbol: '', supply: '', decimals: 18, tax: '' });

    } catch (err) {
      console.error(err);
      setDeployMessage("❌ Error: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🛡️ Fee Token Deployer</h2>

        <form onSubmit={handleDeploy}>
          <input style={styles.input} placeholder="Token Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <input style={styles.input} placeholder="Token Symbol" value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} required />
          <input style={styles.input} type="number" placeholder="Total Supply" value={formData.supply} onChange={e => setFormData({...formData, supply: e.target.value})} required />
          <input style={styles.input} type="number" placeholder="Decimals (Default: 18)" value={formData.decimals} onChange={e => setFormData({...formData, decimals: e.target.value})} />
          <input style={styles.input} type="number" placeholder="Tax (e.g., 500 for 5%)" value={formData.tax} onChange={e => setFormData({...formData, tax: e.target.value})} required />

          <button style={styles.button} disabled={loading}>
            {loading ? "⏳ Processing..." : "Deploy Fee Token"}
          </button>
        </form>

        {deployMessage && (
          <div style={deployMessage.includes("❌") ? styles.errorBox : styles.successBox}>
            <p style={{ margin: 0 }}>{deployMessage}</p>
          </div>
        )}

        {tokenAddress && (
          <div style={styles.resultBox}>
            <p style={{ fontSize: '12px', margin: '0 0 8px 0' }}>✅ Live Contract Address:</p>
            <div style={styles.addressArea}>
              <span style={{ fontSize: '12px' }}>{tokenAddress}</span>
              <button onClick={copyToClipboard} style={styles.copyBtn}>
                {copySuccess ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0a1120", color: "#fff", fontFamily: "'Inter', sans-serif" },
  card: { background: "#162031", padding: "30px", borderRadius: "16px", width: "360px", border: "1px solid #1e293b", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" },
  title: { textAlign: "center", marginBottom: "25px", fontSize: '22px', fontWeight: 'bold', color: '#fbbf24' }, // Yellowish for Fee/Tax
  input: { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #334155", background: "#0a1120", color: "#fff", boxSizing: 'border-box' },
  button: { width: "100%", padding: "14px", background: "linear-gradient(90deg, #d97706, #fbbf24)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  successBox: { marginTop: "15px", padding: "12px", borderRadius: "8px", background: "#064e3b", border: "1px solid #10b981", color: "#10b981", textAlign: "center", fontSize: "12px" },
  errorBox: { marginTop: "15px", padding: "12px", borderRadius: "8px", background: "#7f1d1d", border: "1px solid #ef4444", color: "#ef4444", textAlign: "center", fontSize: "12px" },
  resultBox: { marginTop: "20px", background: "#0a1120", padding: "15px", borderRadius: "8px", border: "1px dashed #fbbf24" },
  addressArea: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", gap: "10px" },
  copyBtn: { padding: "5px 10px", fontSize: "10px", cursor: "pointer", background: "#334155", color: "#fff", border: "none", borderRadius: "4px" }
};

export default FeeToken;