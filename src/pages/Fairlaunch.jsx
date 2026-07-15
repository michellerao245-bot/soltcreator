// ──────────────────────────────────────────────────────────────
//  src/components/pages/Fairlaunch.jsx
//  Fairlaunch Form – Bonding Curve Presale (DX.app Premium)
// ──────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  FaChartLine, FaDollarSign, FaClock, FaUsers,
  FaInfoCircle, FaChevronDown, FaChevronUp, FaCopy, FaExternalLinkAlt
} from "react-icons/fa";
import { toast } from "react-hot-toast";

const Fairlaunch = ({
  tokenInfo,
  params,
  computed = {},
  onTokenAddressChange,
  onInputChange,
  onNext,
  onBack,
  loading = false,
}) => {
  // ── Local state for collapsible sections ──
  const [collapsed, setCollapsed] = useState({
    tokenInfo: false,
    saleSettings: false,
    timeline: false,
    whitelist: false,
  });

  const toggleSection = (section) => {
    setCollapsed(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied!");
  };

  // ── Derived preview values ──
  const startingPrice = parseFloat(params.startingPrice) || 0;
  const priceIncrement = parseFloat(params.priceIncrement) || 0;
  const totalSupplyCurve = parseFloat(params.totalSupplyCurve) || 0;
  const maxContribution = parseFloat(params.maxContribution) || 0;

  // Estimated price after raising 10 BNB
  const estimatedPriceAfter10BNB = startingPrice + (priceIncrement * 10);

  return (
    <div className="form-area">
      <div className="form-sections">
        {/* ─── Token Info Card ─── */}
        <div className="form-card">
          <div
            className="card-header clickable"
            onClick={() => toggleSection('tokenInfo')}
          >
            <FaChartLine className="card-icon" />
            <h4>Token Information</h4>
            <span className="card-toggle">
              {collapsed.tokenInfo ? <FaChevronDown /> : <FaChevronUp />}
            </span>
          </div>
          {!collapsed.tokenInfo && (
            <div className="card-body">
              <div className="form-group full-width">
                <label>Token Address *</label>
                <div className="input-with-actions">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={tokenInfo?.address || ""}
                    onChange={(e) => {
                      if (onTokenAddressChange) {
                        onTokenAddressChange(e.target.value);
                      }
                    }}
                    disabled={loading}
                  />
                  <button
                    className="action-btn"
                    onClick={() => handleCopy(tokenInfo?.address)}
                    disabled={!tokenInfo?.address}
                  >
                    <FaCopy />
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => window.open(`https://bscscan.com/token/${tokenInfo?.address}`, "_blank")}
                    disabled={!tokenInfo?.address}
                  >
                    <FaExternalLinkAlt />
                  </button>
                </div>
                <div className="token-status">
                  {tokenInfo?.isVerified && (
                    <span className="status-badge verified">✅ Verified</span>
                  )}
                  <span className="status-badge info">🔍 {tokenInfo?.symbol || '...'}</span>
                  <span className="status-badge info">📊 {tokenInfo?.decimals || 18} decimals</span>
                </div>
              </div>

              {tokenInfo?.name && (
                <div className="token-preview">
                  <div className="preview-row">
                    <span>Name:</span>
                    <strong>{tokenInfo.name}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Symbol:</span>
                    <strong>{tokenInfo.symbol}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Total Supply:</span>
                    <strong>{tokenInfo.totalSupply}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Your Balance:</span>
                    <strong>{tokenInfo.balance}</strong>
                  </div>
                  <div className="preview-row highlight">
                    <span>Required Deposit:</span>
                    <strong>{computed.totalDeposit || '0'} {tokenInfo.symbol}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Fairlaunch Settings Card ─── */}
        <div className="form-card">
          <div
            className="card-header clickable"
            onClick={() => toggleSection('saleSettings')}
          >
            <FaDollarSign className="card-icon" />
            <h4>Fairlaunch Settings (Bonding Curve)</h4>
            <span className="card-toggle">
              {collapsed.saleSettings ? <FaChevronDown /> : <FaChevronUp />}
            </span>
          </div>
          {!collapsed.saleSettings && (
            <div className="card-body">
              <div className="form-group full-width">
                <div className="info-box">
                  <FaInfoCircle />
                  <span>Price increases with every BNB raised. No hard cap.</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Starting Price (BNB) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="startingPrice"
                    placeholder="0.001"
                    value={params.startingPrice}
                    onChange={onInputChange}
                    disabled={loading}
                  />
                  <small className="helper-text">Price for first buyer</small>
                </div>
                <div className="form-group">
                  <label>Price Increment per BNB *</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="priceIncrement"
                    placeholder="0.0001"
                    value={params.priceIncrement}
                    onChange={onInputChange}
                    disabled={loading}
                  />
                  <small className="helper-text">How much price increases per BNB raised</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Total Supply for Curve *</label>
                  <input
                    type="number"
                    name="totalSupplyCurve"
                    placeholder="1000000"
                    value={params.totalSupplyCurve}
                    onChange={onInputChange}
                    disabled={loading}
                  />
                  <small className="helper-text">Total tokens available for sale</small>
                </div>
                <div className="form-group">
                  <label>Max Contribution (BNB) *</label>
                  <input
                    type="number"
                    name="maxContribution"
                    placeholder="5"
                    value={params.maxContribution}
                    onChange={onInputChange}
                    disabled={loading}
                  />
                  <small className="helper-text">Per wallet limit</small>
                </div>
              </div>

              {/* ─── Fairlaunch Preview ─── */}
              {startingPrice > 0 && priceIncrement > 0 && (
                <div className="fairlaunch-preview">
                  <h6>📊 Price Projection</h6>
                  <div className="preview-grid">
                    <div className="preview-item">
                      <span className="label">Starting Price:</span>
                      <span className="value gold">{startingPrice.toFixed(4)} BNB</span>
                    </div>
                    <div className="preview-item">
                      <span className="label">After 10 BNB raised:</span>
                      <span className="value gold">{estimatedPriceAfter10BNB.toFixed(4)} BNB</span>
                    </div>
                    <div className="preview-item">
                      <span className="label">Price Increment:</span>
                      <span className="value">{priceIncrement.toFixed(4)} BNB</span>
                    </div>
                    <div className="preview-item">
                      <span className="label">Max Contribution:</span>
                      <span className="value">{maxContribution || 'Unlimited'} BNB</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Timeline Card ─── */}
        <div className="form-card">
          <div
            className="card-header clickable"
            onClick={() => toggleSection('timeline')}
          >
            <FaClock className="card-icon" />
            <h4>Timeline</h4>
            <span className="card-toggle">
              {collapsed.timeline ? <FaChevronDown /> : <FaChevronUp />}
            </span>
          </div>
          {!collapsed.timeline && (
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={params.startDate}
                    onChange={onInputChange}
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={params.endDate}
                    onChange={onInputChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Whitelist Card ─── */}
        <div className="form-card">
          <div
            className="card-header clickable"
            onClick={() => toggleSection('whitelist')}
          >
            <FaUsers className="card-icon" />
            <h4>Whitelist</h4>
            <span className="card-toggle">
              {collapsed.whitelist ? <FaChevronDown /> : <FaChevronUp />}
            </span>
          </div>
          {!collapsed.whitelist && (
            <div className="card-body">
              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="whitelistEnabled"
                    checked={params.whitelistEnabled}
                    onChange={onInputChange}
                    disabled={loading}
                  />
                  Enable Whitelist
                </label>
              </div>
              {params.whitelistEnabled && (
                <div className="form-group full-width">
                  <label>Whitelist Addresses</label>
                  <input
                    type="text"
                    name="whitelistAddresses"
                    placeholder="0x...,0x..."
                    value={params.whitelistAddresses}
                    onChange={onInputChange}
                    disabled={loading}
                  />
                  <small className="helper-text">Comma separated addresses</small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <div className="form-navigation">
        <button className="secondary-btn" onClick={onBack} disabled={loading}>
          ← Back
        </button>
        <button className="primary-btn" onClick={onNext} disabled={loading}>
          Next: Review →
        </button>
      </div>

      <style>{`
        .info-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(212, 175, 55, 0.05);
          border: 1px solid rgba(212, 175, 55, 0.08);
          border-radius: var(--radius-sm);
          color: var(--gold-light);
          font-size: 13px;
          margin-bottom: 12px;
        }
        .fairlaunch-preview {
          margin-top: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-sm);
        }
        .fairlaunch-preview h6 {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }
        .preview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 16px;
        }
        .preview-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }
        .preview-item .label {
          color: var(--text-secondary);
        }
        .preview-item .value {
          color: var(--text-primary);
          font-weight: 500;
        }
        .preview-item .value.gold {
          color: var(--gold);
        }
        @media (max-width: 768px) {
          .preview-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Fairlaunch;