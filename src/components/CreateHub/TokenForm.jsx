/* eslint-disable no-undef */
import React, { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, parseAbi, decodeEventLog } from 'viem';
// PATH CORRECTED: index.html aur main.jsx ke level par rakhi file ke liye
import FACTORY_ABI from '../../contractABI.json'; 

const TokenForm = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', symbol: '', supply: '' });
  const [approveHash, setApproveHash] = useState(undefined);
  const [deployHash, setDeployHash] = useState(undefined);
  const [deployedAddress, setDeployedAddress] = useState("");

  // Vite .env variables use kar rahe hain
  const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || "0xc8fBBfa8172D3FF165889259C3a02eC5a5Cc3a18";
  const SOLT_TOKEN_ADDRESS = import.meta.env.VITE_SOLT_TOKEN_ADDRESS || "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9";
  const DEPLOY_FEE = "2000"; 

  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { isSuccess: isApproveConfirmed, isLoading: isApproveWaiting } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: isDeployConfirmed, data: deployReceipt, isLoading: isDeployWaiting } = useWaitForTransactionReceipt({ hash: deployHash });

  useEffect(() => {
    if (isDeployConfirmed && deployReceipt) {
      try {
        const factoryLog = deployReceipt.logs.find(
          (log) => log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()
        );

        if (factoryLog) {
          const decoded = decodeEventLog({
            abi: FACTORY_ABI,
            data: factoryLog.data,
            topics: factoryLog.topics,
          });
          const finalAddr = decoded?.args?.[0] || decoded?.args?.token || decoded?.args?.tokenAddress;
          if (finalAddr) {
            setDeployedAddress(finalAddr);
            setStep(3);
          }
        } else {
          const lastLog = deployReceipt.logs[deployReceipt.logs.length - 1];
          if (lastLog && lastLog.topics[1]) {
            const rawAddr = "0x" + lastLog.topics[1].slice(26);
            setDeployedAddress(rawAddr);
            setStep(3);
          }
        }
      } catch (err) {
        console.error("Decode Error:", err);
        setStep(3);
      }
    }
  }, [isDeployConfirmed, deployReceipt]);

  const handleApprove = async () => {
    if (!isConnected) return alert("Bhai, pehle Wallet connect karo!");
    try {
      const hash = await writeContractAsync({
        address: SOLT_TOKEN_ADDRESS,
        abi: parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]),
        functionName: 'approve',
        args: [FACTORY_ADDRESS, parseUnits(DEPLOY_FEE, 18)],
      });
      setApproveHash(hash);
    } catch (e) { console.error("Approve Error:", e); }
  };

  const handleDeploy = async () => {
    try {
      const hash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createStandardToken',
        args: [formData.name, formData.symbol, BigInt(formData.supply || "0"), 18],
      });
      setDeployHash(hash);
    } catch (e) { console.error("Deploy Error:", e); }
  };

  return (
    <div className="token-form-wrapper">
      {step === 1 && (
        <div className="form-card-ui">
          <h2 className="step-title" style={{ color: '#00ffcc' }}>1. Token Details</h2>
          <div className="input-container">
            <label>Token Name</label>
            <input type="text" placeholder="e.g. My Custom Token" onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="input-container">
            <label>Token Symbol</label>
            <input type="text" placeholder="e.g. MCT" onChange={e => setFormData({...formData, symbol: e.target.value})} />
          </div>
          <div className="input-container">
            <label>Total Supply</label>
            <input type="number" placeholder="e.g. 1000000" onChange={e => setFormData({...formData, supply: e.target.value})} />
          </div>
          <button className="primary-btn" onClick={() => setStep(2)}>Review Launch</button>
        </div>
      )}

      {step === 2 && (
        <div className="form-card-ui">
          <h2 className="step-title" style={{ color: '#00ffcc' }}>2. Final Review</h2>
          <div className="review-stats" style={{background: '#0a0a0a', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #333'}}>
            <p><strong>Name:</strong> {formData.name}</p>
            <p><strong>Symbol:</strong> {formData.symbol}</p>
            <p><strong>Supply:</strong> {formData.supply}</p>
            <p style={{color: '#f59e0b'}}><strong>Fee:</strong> {DEPLOY_FEE} SOLT</p>
          </div>
          
          <button 
            className={`action-btn ${isApproveConfirmed ? 'btn-done' : ''}`}
            onClick={handleApprove}
            disabled={isApproveConfirmed || isApproveWaiting}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', cursor: 'pointer' }}
          >
            {isApproveWaiting ? "Confirming..." : isApproveConfirmed ? "2000 SOLT Approved ✓" : `Step 1: Approve ${DEPLOY_FEE} SOLT`}
          </button>
          
          <button 
            className="action-btn deploy-btn"
            onClick={handleDeploy}
            disabled={!isApproveConfirmed || isDeployWaiting}
            style={{ width: '100%', padding: '10px', opacity: isApproveConfirmed ? 1 : 0.4, cursor: isApproveConfirmed ? 'pointer' : 'not-allowed' }}
          >
            {isDeployWaiting ? "Deploying on Chain..." : "Step 2: Deploy Token"}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="form-card-ui success-card">
          <h2 className="success-glow" style={{ color: '#00ffcc' }}>Mission Success!</h2>
          <div className="addr-box" style={{ background: '#111', padding: '10px', borderRadius: '5px' }}>
            <span style={{fontSize: '12px', color: '#888'}}>Contract Address:</span>
            <p style={{color: '#f59e0b', wordBreak: 'break-all'}}>{deployedAddress || "Fetching Address..."}</p>
          </div>
          <button className="primary-btn" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>Create New Token</button>
        </div>
      )}
    </div>
  );
};

export default TokenForm;