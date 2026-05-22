import React, { useState } from 'react';
import { ethers } from 'ethers';
import FACTORY_ABI from '../contractABI.json';

const BurnToken = () => {
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
      // STEP 1: APPROVE SOLT (Same as Standard)
      // =========================
      const solt = new ethers.Contract(
        SOLT_TOKEN_ADDRESS,
        ["function approve(address spender, uint256 amount) returns (bool)"],
        signer
      );

      console.log("🚀 Initiating Step 1: Approval for Burn Token...");
      const approveTx = await solt.approve(
        FACTORY_ADDRESS,
        ethers.parseUnits("2000", 18) // Fee amount
      );

      alert("Step 1: Approval Successful! Please wait for the Burn Token Deployment popup...");
      await approveTx.wait();

      // 🔥 CRITICAL DELAY
      await new Promise(resolve => setTimeout(resolve, 5000));

      // =========================
      // STEP 2: DEPLOY BURN TOKEN
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

      console.log("🚀 Initiating Step 2: Deployment (Burnable)...");
      const supplyWei = ethers.parseUnits(supply.toString(), decimals);

      // Function name change to 'createBurnToken'
      const tx = await factory.createBurnToken(
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
        alert("🔥 Burn Token Deployed Successfully:\n" + deployedAddress);
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
        <h2 style={styles.title}>🔥 Burn Token Deployer</h2>

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
            {loading ? "⏳ Minting Burnable Token..." : "Deploy Burn Token"}
          </button>
        </form>

        <p style={styles.note}>
          <b>Note:</b> After approval, wait 5-10 seconds for the deployment transaction. This token will have built-in burn functions.
        </p>

        {tokenAddress && (
          <div style={styles.result}>
            <p style={{ fontSize: '12px', color: '#f87171', fontWeight: 'bold' }}>✅ Burn Token Live:</p>
            <p style={{ wordBreak: "break-all", fontSize: '12px', color: '#cbd5e1' }}>{tokenAddress}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0a1120", color: "#fff", fontFamily: "'Inter', sans-serif" },
  card: { background: "#162031", padding: "30px", borderRadius: "16px", width: "360px", border: "1px solid #1e293b", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" },
  title: { textAlign: "center", marginBottom: "25px", fontSize: '22px', fontWeight: 'bold', color: '#f87171' },
  input: { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #334155", background: "#0a1120", color: "#fff", outline: "none", boxSizing: 'border-box' },
  button: { width: "100%", padding: "14px", background: "linear-gradient(90deg, #ef4444, #f87171)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  note: { fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '15px', lineHeight: '1.4' },
  result: { marginTop: "20px", background: "#0a1120", padding: "12px", borderRadius: "8px", border: "1px dashed #f87171" }
};

export default BurnToken;