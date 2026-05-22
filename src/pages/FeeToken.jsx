import React, { useState } from 'react';
import { ethers } from 'ethers';
import FACTORY_ABI from '../contractABI.json';

const FeeToken = () => {
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    supply: '',
    decimals: '18',
    tax: '2%'
  });

  const FACTORY_ADDRESS = "0xc8fBBfa8172D3FF165889259C3a02eC5a5Cc3a18";
  const SOLT_TOKEN_ADDRESS = "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";

  const handleDeploy = async (e) => {
    e.preventDefault();

    if (!window.ethereum) {
      return alert("Please install MetaMask !");
    }

    try {
      setLoading(true);

      await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Network check
      const network = await provider.getNetwork();
      if (network.chainId !== 56n) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }],
        });
      }

      // ✅ APPROVE
      const soltContract = new ethers.Contract(
        SOLT_TOKEN_ADDRESS,
        [
          "function approve(address spender, uint256 amount) public returns (bool)",
          "function allowance(address owner, address spender) view returns (uint256)"
        ],
        signer
      );

      console.log("Approving 2000 SOLT...");
      const approveTx = await soltContract.approve(
        FACTORY_ADDRESS,
        ethers.parseUnits("2000", 18)
      );
      await approveTx.wait();

      // ✅ DEPLOY
      const factoryContract = new ethers.Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI,
        signer
      );

     const supplyWei = window.BigInt(formData.supply);

      const tx = await factoryContract.createFeeToken(
        formData.name,
        formData.symbol,
        supplyWei,
        parseInt(formData.decimals),
        parseInt(formData.tax) * 100 // ⚠️ IMPORTANT FIX
      );

      console.log("TX HASH:", tx.hash);

      const receipt = await tx.wait();

      // ✅ TOKEN ADDRESS EXTRACT
      const event = receipt.logs.find(log => log.fragment?.name === "TokenCreated");

      let deployedAddress = "";
      if (event) {
        deployedAddress = event.args.token;
        setTokenAddress(deployedAddress);
      }

      alert(`🎉 Token deployed!\nAddress: ${deployedAddress}`);

      // RESET
      setFormData({
        name: '',
        symbol: '',
        supply: '',
        decimals: '18',
        tax: '2%'
      });

    } catch (err) {
      console.error(err);

      if (err.code === 4001) {
        alert("Transaction cancel kar di.");
      } else {
        alert(err.reason || err.message);
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <h2 style={styles.title}>🚀 Deploy Fee Token</h2>

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
            placeholder="Symbol"
            value={formData.symbol}
            onChange={e => setFormData({ ...formData, symbol: e.target.value })}
            required
          />

          <input
            style={styles.input}
            type="number"
            placeholder="Total Supply (e.g. 100000)"
            value={formData.supply}
            onChange={e => setFormData({ ...formData, supply: e.target.value })}
            required
          />

          <input
            style={styles.input}
            type="number"
            placeholder="Tax % (max 10)"
            value={formData.tax}
            onChange={e => setFormData({ ...formData, tax: e.target.value })}
            required
          />

          <button style={styles.button} disabled={loading}>
            {loading ? "⏳ Processing..." : "Deploy Fee Token"}
          </button>

        </form>

        {/* ✅ SHOW TOKEN ADDRESS */}
        {tokenAddress && (
          <div style={styles.result}>
            <p>✅ Token Successfully Deployed:</p>
            <p style={{ wordBreak: "break-all", color: "#22c55e" }}>
              {tokenAddress}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

// 🎨 STYLES
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #0f172a)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff"
  },
  card: {
    background: "#0f172a",
    padding: "30px",
    borderRadius: "16px",
    width: "380px",
    boxShadow: "0 0 30px rgba(0,0,0,0.7)"
  },
  title: {
    textAlign: "center",
    marginBottom: "20px"
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#020617",
    color: "#fff",
    outline: "none"
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer"
  },
  result: {
    marginTop: "20px",
    background: "#020617",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #334155"
  }
};

export default FeeToken;