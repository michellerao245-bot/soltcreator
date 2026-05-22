import React, { useEffect } from 'react';

const PrivatePolicy = () => {
  // Page load hote hi screen top par scroll ho jayegi
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 md:py-20 text-left">
      {/* Header Panel */}
      <div className="border-b border-cyan-500/10 pb-6 mb-8">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
          Privacy <span className="text-cyan-400 font-black">Policy</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-500 font-mono mt-2">
          Last Updated: May 2026 | Legal Jurisdiction: New Delhi, India
        </p>
      </div>

      {/* Intro Text */}
      <p className="text-gray-400 mb-8 leading-relaxed text-sm md:text-base font-light">
        Welcome to **Soltchain Technologies** (owners and operators of the Soltcoin token, SoltHub platform, and associated decentralized infrastructure). This Privacy Policy describes how we manage, collect, or process personal information under the **Information Technology Act, 2000** of India and other applicable legal frameworks in New Delhi. By using our website, decentralized tools, or interacting with our smart contracts, you agree to the terms of this policy.
      </p>

      {/* Content Layout */}
      <div className="space-y-8 text-gray-400 font-light text-sm md:text-base leading-relaxed">
        
        {/* Section 1 */}
        <section className="bg-[#131e35]/20 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg md:text-xl font-bold text-amber-500 mb-3 flex items-center gap-2">
            <span>01.</span> Information We Collect
          </h2>
          <p className="mb-3">
            Due to the non-custodial and decentralized nature of Web3 applications on the blockchain, we do not traditionally collect sensitive data. However, for platform security and UI optimization, we may look at:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-gray-300 font-mono text-xs md:text-sm">
            <li>Public Cryptographic Wallet Addresses</li>
            <li>IP Address & Location Data</li>
            <li>Device/Browser Specifications</li>
            <li>Voluntarily submitted Email or Preferences (for Newsletters/Support)</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-[#131e35]/20 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg md:text-xl font-bold text-amber-500 mb-3 flex items-center gap-2">
            <span>02.</span> Purpose of Collection
          </h2>
          <p>
            Soltchain Technologies processes this data to operate its decentralized services safely, update you on the technical progress of SoltHub, provide customer support via digital channels, and enforce automated security checks to prevent malicious exploitation of public dApps.
          </p>
        </section>

        {/* Section 3 */}
        <section className="bg-[#131e35]/20 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg md:text-xl font-bold text-amber-500 mb-3 flex items-center gap-2">
            <span>03.</span> Web3 & Blockchain Transparency
          </h2>
          <p>
            Please note that transactions, staking actions, or interactions executed via SoltHub smart contracts are broadcast publicly onto mutable/immutable blockchain mainnets. This public data is inherent to decentralized ledger technology and is outside the structural control of Soltchain Technologies.
          </p>
        </section>

        {/* Section 4 */}
        <section className="bg-[#131e35]/20 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg md:text-xl font-bold text-amber-500 mb-3 flex items-center gap-2">
            <span>04.</span> Data Security & SSL Encryption
          </h2>
          <p>
            We take industry-standard administrative precautions using password-protected architectures, limited employee access, and Secure Socket Layer (SSL) encryption setups to protect data under our purview. Public social media interactions (e.g., Twitter/X, Telegram) remain completely public at the user's risk.
          </p>
        </section>

        {/* Section 5 */}
        <section className="bg-[#131e35]/20 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg md:text-xl font-bold text-amber-500 mb-3 flex items-center gap-2">
            <span>05.</span> Jurisdiction & Legal Compliance
          </h2>
          <p>
            Any disputes, data queries, or statutory legal complaints regarding privacy matters shall be exclusively governed by the courts and regulatory laws of **New Delhi, India**. For communication or data rectification queries, users can contact us via our official support network.
          </p>
        </section>

      </div>
    </div>
  );
};

export default PrivatePolicy;