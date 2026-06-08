import React, { useState } from 'react';
import { ethers } from 'ethers';
import FACTORY_ABI from '../contractABI.json';

/**
 * BurnToken Deployer Component
 * Features: Approval, Deployment, Copy-to-Clipboard, Success UI
 */
const BurnToken = () => {
  // --- States ---
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [deployMessage, setDeployMessage] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    supply: '',
    decimals: 18
  });

  // --- Constants ---
  const FACTORY_ADDRESS = "0xc8fBBfa8172D3FF165889259C3a02eC5a5Cc3a18";
  const SOLT_TOKEN_ADDRESS = "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";
  const FEE_AMOUNT = "2000"; // Updated Fee

  // --- Utility: Copy to Clipboard ---
  const copyToClipboard = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // --- Handle Deployment ---
  const handleDeploy = async (e) => {
    e.preventDefault();
    if (!window.ethereum) return alert("MetaMask not detected.");

    try {
      setLoading(true);
      setDeployMessage("🚀 Preparing deployment...");
      setTokenAddress("");

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Network Check
      const network = await provider.getNetwork();
      if (network.chainId !== 56n) {
        setDeployMessage("🌐 Switching to BSC Network...");
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }],
        });
      }

      // Step 1: Approve 2000 SOLT
      setDeployMessage("⏳ Approving 2000 SOLT fee...");
      const solt = new ethers.Contract(
        SOLT_TOKEN_ADDRESS,
        ["function approve(address spender, uint256 amount) returns (bool)"],
        signer
      );
      
      const approveTx = await solt.approve(FACTORY_ADDRESS, ethers.parseUnits(FEE_AMOUNT, 18));
      await approveTx.wait();

      // Step 2: Deploy Contract
      setDeployMessage("⏳ Deploying Burnable Token...");
      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      const tx = await factory.createBurnableToken(
        formData.name,
        formData.symbol,
        BigInt(formData.supply),
        Number(formData.decimals)
      );

      const receipt = await tx.wait();

      // Extract Address
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
      setDeployMessage("🔥 Burn Token Deployed Successfully!");
      setFormData({ name: '', symbol: '', supply: '', decimals: 18 });

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
        <h2 style={styles.title}>🔥 Burn Token Deployer</h2>

        <form onSubmit={handleDeploy}>
          <input style={styles.input} placeholder="Token Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <input style={styles.input} placeholder="Token Symbol" value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} required />
          <input style={styles.input} type="number" placeholder="Total Supply" value={formData.supply} onChange={e => setFormData({...formData, supply: e.target.value})} required />
          <input style={styles.input} type="number" placeholder="Decimals (Default: 18)" value={formData.decimals} onChange={e => setFormData({...formData, decimals: e.target.value})} />

          <button style={styles.button} disabled={loading}>
            {loading ? "⏳ Processing..." : "Deploy Burn Token"}
          </button>
        </form>

        {/* Message Box */}
        {deployMessage && (
          <div style={deployMessage.includes("❌") ? styles.errorBox : styles.successBox}>
            <p style={{ margin: 0 }}>{deployMessage}</p>
          </div>
        )}

        {/* Copyable Address Box */}
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

// --- Updated Styles for professional look ---
const styles = {
  container: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0a1120", color: "#fff", fontFamily: "'Inter', sans-serif" },
  card: { background: "#162031", padding: "30px", borderRadius: "16px", width: "360px", border: "1px solid #1e293b", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" },
  title: { textAlign: "center", marginBottom: "25px", fontSize: '22px', fontWeight: 'bold', color: '#f87171' },
  input: { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #334155", background: "#0a1120", color: "#fff", boxSizing: 'border-box' },
  button: { width: "100%", padding: "14px", background: "linear-gradient(90deg, #ef4444, #f87171)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  successBox: { marginTop: "15px", padding: "12px", borderRadius: "8px", background: "#052e16", border: "1px solid #22c55e", color: "#22c55e", textAlign: "center", fontSize: "12px" },
  errorBox: { marginTop: "15px", padding: "12px", borderRadius: "8px", background: "#450a0a", border: "1px solid #ef4444", color: "#ef4444", textAlign: "center", fontSize: "12px" },
  resultBox: { marginTop: "20px", background: "#0a1120", padding: "15px", borderRadius: "8px", border: "1px dashed #f87171" },
  addressArea: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", gap: "10px" },
  copyBtn: { padding: "5px 10px", fontSize: "10px", cursor: "pointer", background: "#334155", color: "#fff", border: "none", borderRadius: "4px" }
};

export default BurnToken;