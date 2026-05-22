import React, { useState, useEffect } from "react";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [campaignData, setCampaignData] = useState({
    tokenName: "",
    bannerUrl: "",
    targetLink: "",
    duration: "3",
    price: "10",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleDurationChange = (days) => {
    let priceCalculated = "10";

    if (days === "7") priceCalculated = "20";
    if (days === "30") priceCalculated = "70";

    setCampaignData({
      ...campaignData,
      duration: days,
      price: priceCalculated,
    });
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      console.log(
        "Initiating SOLT Token Web3 Payment Sequence:",
        campaignData
      );

      setTimeout(() => {
        setIsSubmitting(false);

        setSuccessMsg(
          `🎉 Payment of ${campaignData.price} SOLT Confirmed! Your banner campaign has been successfully deployed.`
        );

        setCampaignData({
          tokenName: "",
          bannerUrl: "",
          targetLink: "",
          duration: "3",
          price: "10",
        });

        setTimeout(() => {
          setIsModalOpen(false);
          setSuccessMsg("");
        }, 4000);
      }, 2000);
    } catch (error) {
      console.error("Blockchain SOLT Transfer Failed:", error);
      setIsSubmitting(false);
    }
  };

  const services = [
    {
      id: "banners",
      title: "Solt Ads Banner System",
      status: "Active",
      statusColor:
        "text-cyan-400 bg-cyan-400/10 border-cyan-500/20",
      description:
        "Get maximum visibility by placing your project's custom visual banners directly on top of SoltDex, SoltHub, and our high-traffic tracking dashboards.",
      badge: "High ROI",

      icon: (
        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-cyan-500 flex flex-col items-center justify-center font-black tracking-wider text-xl md:text-3xl rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.15)] text-white">
          ADS BANNER

          <span className="text-xs font-mono font-normal tracking-widest text-cyan-200 mt-1">
            SOLT SYSTEM
          </span>
        </div>
      ),
    },

    {
      id: "pinning",
      title: "Trending & Pinning Sale",
      status: "Coming Soon",
      statusColor:
        "text-amber-500 bg-amber-500/10 border-amber-500/20",
      description:
        "Keep your presale locked right at the top of the pool explorer list. Pinning guarantees that every single user looking for active launchpads views your project first.",
      badge: "Hot Feature",

      icon: (
        <div className="w-full h-full bg-[#131e35] border border-gray-800 flex items-center justify-center rounded-xl relative group">
          <span className="text-5xl md:text-6xl filter drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-bounce duration-1000">
            📌
          </span>

          <div className="absolute inset-0 bg-red-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ),
    },

    {
      id: "ama",
      title: "Book an AMA Session",
      status: "Coming Soon",
      statusColor:
        "text-amber-500 bg-amber-500/10 border-amber-500/20",
      description:
        "Connect directly with the community. Schedule a live Ask-Me-Anything session hosted inside our official Soltcoin global channels to answer investor doubts and clear audits.",
      badge: "Community",

      icon: (
        <div className="w-full h-full bg-[#131e35] border border-gray-800 flex flex-col items-center justify-center rounded-xl relative group">
          <span className="text-5xl md:text-6xl filter drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] mb-1">
            💬
          </span>

          <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest">
            Ask Me Anything
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 md:py-16 text-left relative">

      {/* Top Tag */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
          🛠️ Ecosystem Growth
        </span>
      </div>

      {/* Heading */}
      <div className="border-b border-gray-800/60 pb-8 mb-10">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
          Advertising &{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Marketing
          </span>
        </h1>

        <p className="text-sm md:text-base text-gray-400 mt-4 max-w-2xl font-light leading-relaxed">
          Boost your project's launch metrics. Use Soltchain's specialized Web3
          advertising vectors to reach targeted DeFi investors, locked liquidity
          providers, and token buyers.
        </p>
      </div>

      {/* Services */}
      <div className="space-y-8">
        {services.map((service) => (
          <div
            key={service.id}
            className="group bg-[#0f172a]/40 border border-gray-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-md flex flex-col md:flex-row gap-6 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_4px_30px_rgba(6,182,212,0.03)]"
          >
            {/* Left */}
            <div className="w-full md:w-72 h-40 md:h-44 flex-shrink-0">
              {service.icon}
            </div>

            {/* Right */}
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                  <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors">
                    {service.title}
                  </h2>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${service.statusColor}`}
                  >
                    {service.status}
                  </span>

                  {service.badge && (
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded-full">
                      {service.badge}
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-sm font-light leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-900 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-500">
                  Target: Web3 Investors
                </span>

                {service.status === "Active" ? (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs md:text-sm px-5 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-[1.02]"
                  >
                    Create Campaign
                  </button>
                ) : (
                  <button
                    disabled
                    className="bg-gray-800/40 text-gray-500 cursor-not-allowed font-medium text-xs md:text-sm px-5 py-2 rounded-xl border border-gray-800/60"
                  >
                    Locked
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      import React, { useState, useEffect } from "react";

const MarketingService = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [campaignData, setCampaignData] = useState({
    tokenName: "",
    bannerUrl: "",
    targetLink: "",
    duration: "3",
    price: "10",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleDurationChange = (days) => {
    let priceCalculated = "10";

    if (days === "7") priceCalculated = "20";
    if (days === "30") priceCalculated = "70";

    setCampaignData({
      ...campaignData,
      duration: days,
      price: priceCalculated,
    });
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      console.log(
        "Initiating SOLT Token Web3 Payment Sequence:",
        campaignData
      );

      setTimeout(() => {
        setIsSubmitting(false);

        setSuccessMsg(
          `🎉 Payment of ${campaignData.price} SOLT Confirmed! Your banner campaign has been successfully deployed.`
        );

        setCampaignData({
          tokenName: "",
          bannerUrl: "",
          targetLink: "",
          duration: "3",
          price: "10",
        });

        setTimeout(() => {
          setIsModalOpen(false);
          setSuccessMsg("");
        }, 4000);
      }, 2000);
    } catch (error) {
      console.error("Blockchain SOLT Transfer Failed:", error);
      setIsSubmitting(false);
    }
  };

  const services = [
    {
      id: "banners",
      title: "Solt Ads Banner System",
      status: "Active",
      statusColor:
        "text-cyan-400 bg-cyan-400/10 border-cyan-500/20",
      description:
        "Get maximum visibility by placing your project's custom visual banners directly on top of SoltDex, SoltHub, and our high-traffic tracking dashboards.",
      badge: "High ROI",

      icon: (
        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-cyan-500 flex flex-col items-center justify-center font-black tracking-wider text-xl md:text-3xl rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.15)] text-white">
          ADS BANNER

          <span className="text-xs font-mono font-normal tracking-widest text-cyan-200 mt-1">
            SOLT SYSTEM
          </span>
        </div>
      ),
    },

    {
      id: "pinning",
      title: "Trending & Pinning Sale",
      status: "Coming Soon",
      statusColor:
        "text-amber-500 bg-amber-500/10 border-amber-500/20",
      description:
        "Keep your presale locked right at the top of the pool explorer list. Pinning guarantees that every single user looking for active launchpads views your project first.",
      badge: "Hot Feature",

      icon: (
        <div className="w-full h-full bg-[#131e35] border border-gray-800 flex items-center justify-center rounded-xl relative group">
          <span className="text-5xl md:text-6xl filter drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-bounce duration-1000">
            📌
          </span>

          <div className="absolute inset-0 bg-red-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ),
    },

    {
      id: "ama",
      title: "Book an AMA Session",
      status: "Coming Soon",
      statusColor:
        "text-amber-500 bg-amber-500/10 border-amber-500/20",
      description:
        "Connect directly with the community. Schedule a live Ask-Me-Anything session hosted inside our official Soltcoin global channels to answer investor doubts and clear audits.",
      badge: "Community",

      icon: (
        <div className="w-full h-full bg-[#131e35] border border-gray-800 flex flex-col items-center justify-center rounded-xl relative group">
          <span className="text-5xl md:text-6xl filter drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] mb-1">
            💬
          </span>

          <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest">
            Ask Me Anything
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 md:py-16 text-left relative">

      {/* Top Tag */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
          🛠️ Ecosystem Growth
        </span>
      </div>

      {/* Heading */}
      <div className="border-b border-gray-800/60 pb-8 mb-10">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
          Advertising &{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Marketing
          </span>
        </h1>

        <p className="text-sm md:text-base text-gray-400 mt-4 max-w-2xl font-light leading-relaxed">
          Boost your project's launch metrics. Use Soltchain's specialized Web3
          advertising vectors to reach targeted DeFi investors, locked liquidity
          providers, and token buyers.
        </p>
      </div>

      {/* Services */}
      <div className="space-y-8">
        {services.map((service) => (
          <div
            key={service.id}
            className="group bg-[#0f172a]/40 border border-gray-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-md flex flex-col md:flex-row gap-6 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_4px_30px_rgba(6,182,212,0.03)]"
          >
            {/* Left */}
            <div className="w-full md:w-72 h-40 md:h-44 flex-shrink-0">
              {service.icon}
            </div>

            {/* Right */}
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                  <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors">
                    {service.title}
                  </h2>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${service.statusColor}`}
                  >
                    {service.status}
                  </span>

                  {service.badge && (
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded-full">
                      {service.badge}
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-sm font-light leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-900 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-500">
                  Target: Web3 Investors
                </span>

                {service.status === "Active" ? (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs md:text-sm px-5 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-[1.02]"
                  >
                    Create Campaign
                  </button>
                ) : (
                  <button
                    disabled
                    className="bg-gray-800/40 text-gray-500 cursor-not-allowed font-medium text-xs md:text-sm px-5 py-2 rounded-xl border border-gray-800/60"
                  >
                    Locked
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>