import React, { useState } from "react";

const docData = {
  welcome: {
    title: "Read me to start",
    subtitle: "Welcome to the Soltchain Hub Documentation. SoltDex is a premier decentralized launchpad platform built on BNB Smart Chain designed to offer zero-coding web3 tools for founders and advanced analytics for investors.",
    sections: [
      { id: "what-is", title: "What is SoltDex?", desc: "Your ultimate zero-coding multi-tool decentralized ecosystem.", type: "gradient-blue" },
      { id: "updates", title: "New Updates", desc: "Stay up to date with multi-chain integrations and core engine releases.", type: "gradient-dark" }
    ]
  },
  products: {
    title: "Core Products Documentation",
    subtitle: "Deep dive into our automated secure smart contracts with built-in verification engines.",
    sections: [
      { id: "soltmint", title: "SoltMint (Token Creator)", desc: "Create Standard, Burnable, or Deflationary tokens instantly.", type: "gradient-purple" },
      { id: "soltsale", title: "SoltSale (DeFi Launchpad)", desc: "Set up Fair-Launches or Presales with customizable fee options.", type: "gradient-green" },
      { id: "soltlock", title: "SoltLock (Liquidity Locker)", desc: "Lock your project tokens or LP tokens securely with customizable vesting.", type: "gradient-orange" }
    ]
  },
  marketing: {
    title: "Marketing Services Hub",
    subtitle: "Boost your project's visibility directly to targeted Web3 investors.",
    sections: [
      { id: "banner", title: "Banner Ads System", desc: "Deploy hyper-targeted visual banners on high-traffic dashboards.", type: "gradient-cyan" },
      { id: "ama", title: "Book an AMA Session", desc: "Connect directly with the global community and clear investor doubts.", type: "gradient-pink" }
    ]
  }
};

const Documentation = () => {
  const [activeTab, setActiveTab] = useState("welcome");

  const currentContent = docData[activeTab];

  // Helper class for high-end dark cyberpunk gradients instead of broken image URLs
  const getGradientClass = (type) => {
    switch (type) {
      case "gradient-blue": return "from-blue-600 via-indigo-900 to-slate-900";
      case "gradient-dark": return "from-purple-900 via-stone-950 to-black";
      case "gradient-purple": return "from-purple-600 via-violet-950 to-slate-900";
      case "gradient-green": return "from-emerald-600 via-teal-950 to-zinc-900";
      case "gradient-orange": return "from-orange-600 via-amber-950 to-neutral-900";
      case "gradient-cyan": return "from-cyan-600 via-sky-950 to-slate-900";
      case "gradient-pink": return "from-rose-600 via-fuchsia-950 to-zinc-900";
      default: return "from-gray-700 to-gray-900";
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b0e14] text-gray-200 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-72 bg-[#0f131c] border-r border-gray-800 p-6 flex flex-col gap-6 tracking-wide">
        <div>
          <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">Welcome</h3>
          <button 
            onClick={() => setActiveTab("welcome")}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "welcome" ? "bg-gradient-to-r from-amber-500/20 to-transparent border-l-2 border-amber-500 text-amber-400" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"}`}
          >
            🔹 What is SoltDex?
          </button>
        </div>

        <div>
          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Core Products</h3>
          <div className="flex flex-col gap-1">
            {["soltmint", "soltsale", "soltlock"].map((prod) => (
              <button
                key={prod}
                onClick={() => setActiveTab("products")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === "products" ? "bg-gradient-to-r from-purple-500/10 to-transparent text-purple-300" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"}`}
              >
                📦 {prod.replace("solt", "Solt")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Marketing Services</h3>
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab("marketing")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "marketing" ? "bg-gradient-to-r from-cyan-500/10 to-transparent text-cyan-300" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"}`}
            >
              📢 Banner Ads System
            </button>
            <button 
              onClick={() => setActiveTab("marketing")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "marketing" ? "bg-gradient-to-r from-cyan-500/10 to-transparent text-cyan-300" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"}`}
            >
              🎤 Book an AMA Session
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT DYNAMIC CONTENT AREA */}
      <main className="flex-1 p-10 max-w-5xl">
        <header className="mb-10 border-b border-gray-800/60 pb-6">
          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">{currentContent.title}</h1>
          <p className="text-gray-400 leading-relaxed max-w-3xl text-base">{currentContent.subtitle}</p>
        </header>

        {/* DYNAMIC CARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentContent.sections.map((card) => (
            <div 
              key={card.id} 
              className="group relative bg-[#131924] border border-gray-800/80 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-cyan-500/5 cursor-pointer"
            >
              {/* Image Container / Premium Metallic Gradient Block */}
              <div className={`w-full h-44 bg-gradient-to-br ${getGradientClass(card.type)} relative flex items-center justify-center border-b border-gray-900 overflow-hidden`}>
                {/* Visual Glow Effect */}
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay group-hover:scale-105 transition-transform duration-500" />
                <span className="text-4xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform duration-300">
                  {card.id.includes("mint") && "🪙"}
                  {card.id.includes("sale") && "🚀"}
                  {card.id.includes("lock") && "🔐"}
                  {card.id.includes("banner") && "🖥️"}
                  {card.id.includes("ama") && "💬"}
                  {card.id === "what-is" && "❓"}
                  {card.id === "updates" && "⚡"}
                </span>
                
                {/* Tech Line Accents */}
                <div className="absolute bottom-2 left-3 text-[10px] font-mono tracking-widest text-white/30 uppercase">Solt_Engine_v1.0</div>
              </div>

              {/* Card Body Details */}
              <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-transparent to-black/20">
                <div>
                  <h2 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors mb-2 flex items-center gap-2">
                    {card.title}
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-800/40 flex justify-between items-center text-xs font-mono text-gray-500">
                  <span>TARGET: WEB3</span>
                  <span className="text-cyan-500/70 group-hover:text-cyan-400 font-bold transition-colors">READ DOCS &rarr;</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Documentation;