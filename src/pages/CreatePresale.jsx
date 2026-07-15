// ──────────────────────────────────────────────────────────────
//  pages/CreatePresale.jsx – PART 1
//  Imports, Config, State, Handlers, Blockchain Functions
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  FaCopy, FaCheck, FaExternalLinkAlt, FaTelegram, FaTwitter,
  FaWallet, FaCoins, FaClock, FaPercent, FaLock, FaUnlock,
  FaUsers, FaChartLine, FaDollarSign, FaInfoCircle, FaExclamationTriangle,
  FaArrowRight, FaCheckCircle, FaSpinner, FaFire, FaStar,
  FaChevronDown, FaChevronUp, FaCalendarAlt, FaRocket, FaGift,
  FaGem, FaShieldAlt, FaBoxes, FaLayerGroup, FaChartPie, FaLink
} from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import "./CreatePresale.css";

// ─── CONFIG ──────────────────────────────────────────────
const CONFIG = {
  factoryAddress: "0x1f0881A554783E810202F5A15f5149d8a1557D64",
  fairLaunchFactory: "0x600845d7Aa5753dd154A958fc6F1125a3f3D490C",
  feeToken: "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9",
  feeAmount: "500",
  treasuryWallet: "0x5516806DB3b02bE4699225CeEF5a14dd087315fF",
  chainId: 56,
  bnbUsdFeed: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
};

const MAX_STEP = 5;
const INITIAL_PARAMS = {
  startDate: "",
  endDate: "",
  whitelistEnabled: false,
  whitelistAddresses: "",
  presaleRate: "",
  listingRate: "",
  softCap: "",
  hardCap: "",
  minBuy: "",
  maxBuy: "",
  refundType: "refund",
  unsoldTokens: "burn",
  enableVesting: false,
  tgePercent: "20",
  cliffPeriod: "30",
  vestingDuration: "180",
  unlockPercent: "10",
  liquidityPercent: "70",
  liquidityLockTime: "365",
  startingPrice: "",
  priceIncrement: "",
  totalSupplyCurve: "",
  maxContribution: "",
  rate: "",
  refundExcess: "true",
};

// ─── LAUNCH TYPES ─────────────────────────────────────────
const launchTypes = [
  {
    id: "presale",
    name: "Presale",
    icon: <FaRocket />,
    desc: "Standard presale with hard/soft caps.",
    fee: "500 SOLT",
    badge: "🔥 Popular",
    color: "#D4AF37",
    features: ["Soft/Hard Cap", "Vesting", "Whitelist", "Liquidity Lock"],
  },
  {
    id: "fairlaunch",
    name: "Fairlaunch",
    icon: <FaChartLine />,
    desc: "Price discovered by demand curve.",
    fee: "600 SOLT",
    badge: "⭐ Trending",
    color: "#2d7dd2",
    features: ["Demand-based Pricing", "No Caps", "Automatic Market"],
  },
  {
    id: "overflow",
    name: "Overflow",
    icon: <FaLayerGroup />,
    desc: "Proportional token distribution.",
    fee: "700 SOLT",
    badge: "💎 Advanced",
    color: "#9b59b6",
    features: ["Proportional Allocation", "No Front-running", "Fairest Model"],
  },
  {
    id: "private",
    name: "Private Sale",
    icon: <FaShieldAlt />,
    desc: "Whitelist only early access.",
    fee: "400 SOLT",
    badge: "🤫 Exclusive",
    color: "#2ecc71",
    features: ["Whitelist Only", "Early Access", "Lower Fees"],
  },
];

// ─── ABIs ──────────────────────────────────────────────
const FACTORY_ABI = [
  "function createPresale(address saleToken, address paymentToken, uint256 pricePerToken, uint256 softCap, uint256 hardCap, uint256 minBuy, uint256 maxBuy, uint256 startTime, uint256 endTime, bool whitelistEnabled, uint256 cliff, uint256 vestingDuration, uint256 tgePercent) external returns (uint256)",
  "function feeToken() view returns (address)",
  "function feeAmount() view returns (uint256)",
  "event PresaleDeployed(uint256 indexed presaleId, address indexed presaleAddress, address indexed creator, address saleToken, address paymentToken, uint256 pricePerToken, uint256 softCap, uint256 hardCap, uint256 startTime, uint256 endTime, uint256 creationFee)",
];

const FAIR_LAUNCH_ABI = [
  "function createFairLaunch(address saleToken, address paymentToken, uint256 startingPrice, uint256 priceIncrement, uint256 totalSupply, uint256 maxContribution, uint256 startTime, uint256 endTime, bool whitelistEnabled) external returns (uint256)",
  "event FairLaunchDeployed(uint256 indexed launchId, address indexed launchAddress, address indexed creator, address saleToken, address paymentToken, uint256 startingPrice, uint256 priceIncrement, uint256 totalSupply, uint256 startTime, uint256 endTime, uint256 creationFee)",
];

const PRESALE_ABI = [
  "function depositTokens(uint256) external",
  "function totalRaised() view returns (uint256)",
  "function hardCap() view returns (uint256)",
  "function softCap() view returns (uint256)",
  "function startTime() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function status() view returns (uint8)",
  "function totalParticipants() view returns (uint256)",
  "function contributions(address) view returns (uint256)",
  "function claimTokens() external",
  "function refund() external",
  "function finalize() external",
  "function setWhitelist(address[],bool) external",
  "function owner() view returns (address)",
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
];

const AGGREGATOR_ABI = ["function latestAnswer() view returns (int256)"];

// ─── MAIN COMPONENT ──────────────────────────────────────
const CreatePresale = () => {
  // ── State ──
  const [step, setStep] = useState(1);
  const [launchType, setLaunchType] = useState("presale");
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    tokenInfo: false,
    saleSettings: false,
    timeline: false,
    refund: false,
    liquidity: false,
  });

  // Blockchain
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [userAddress, setUserAddress] = useState("");
  const [networkId, setNetworkId] = useState(null);
  const [userBalance, setUserBalance] = useState("0");

  // Token info
  const [tokenInfo, setTokenInfo] = useState({
    address: "",
    name: "",
    symbol: "",
    decimals: 18,
    totalSupply: "0",
    balance: "0",
    isVerified: false,
  });

  // Presale params
  const [params, setParams] = useState(INITIAL_PARAMS);

  // ── Computed ──
  const [presaleTokens, setPresaleTokens] = useState("0");
  const [presaleTokensWei, setPresaleTokensWei] = useState("0");
  const [liquidityTokens, setLiquidityTokens] = useState("0");
  const [liquidityTokensWei, setLiquidityTokensWei] = useState("0");
  const [totalDeposit, setTotalDeposit] = useState("0");
  const [totalDepositWei, setTotalDepositWei] = useState("0");
  const [liquidityBNB, setLiquidityBNB] = useState("0");
  const [lpTokens, setLpTokens] = useState("0");
  const [tokenPriceUsd, setTokenPriceUsd] = useState("0");
  const [estimatedMC, setEstimatedMC] = useState("0");
  const [fdv, setFdv] = useState("0");
  const [pricePerTokenWei, setPricePerTokenWei] = useState("0");
  const [estimatedRaise, setEstimatedRaise] = useState("0");
  const [lpLockEndDate, setLpLockEndDate] = useState("");

  // ── Approval & deposit ──
  const [feeApproved, setFeeApproved] = useState(false);
  const [tokenApproved, setTokenApproved] = useState(false);
  const [deposited, setDeposited] = useState(false);
  const [presaleAddress, setPresaleAddress] = useState("");
  const [presaleId, setPresaleId] = useState(null);
  const [presaleContract, setPresaleContract] = useState(null);
  const [raisedAmount, setRaisedAmount] = useState("0");
  const [participants, setParticipants] = useState(0);
  const [progress, setProgress] = useState(0);

  // BNB price
  const [bnbPrice, setBnbPrice] = useState(300);

  // ── Refs ──
  const presaleContractRef = useRef(null);

  // ── Derived ──
  const selectedFee = launchTypes.find(t => t.id === launchType)?.fee || "500 SOLT";
  const selectedLaunch = launchTypes.find(t => t.id === launchType) || launchTypes[0];

  // ─── Ethers v6 Helpers ──────────────────────────────────
  const getProvider = useCallback(() => {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, []);

  // ── Fetch BNB Price ──
  useEffect(() => {
    const fetchBnbPrice = async () => {
      try {
        const prov = getProvider();
        if (!prov) return;
        const agg = new ethers.Contract(CONFIG.bnbUsdFeed, AGGREGATOR_ABI, prov);
        const price = await agg.latestAnswer();
        setBnbPrice(Number(price) / 1e8);
      } catch {
        setBnbPrice(300);
      }
    };
    fetchBnbPrice();
  }, [getProvider]);

  // ── Connect Wallet ──
  const connectWallet = useCallback(async () => {
    try {
      const prov = getProvider();
      if (!prov) throw new Error("No wallet");
      const signerObj = await prov.getSigner();
      const address = await signerObj.getAddress();
      const network = await prov.getNetwork();
      if (Number(network.chainId) !== CONFIG.chainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${CONFIG.chainId.toString(16)}` }],
          });
          return await connectWallet();
        } catch {
          toast.error(`Please switch to BSC (chainId ${CONFIG.chainId})`);
          return null;
        }
      }
      setProvider(prov);
      setSigner(signerObj);
      setUserAddress(address);
      setNetworkId(Number(network.chainId));

      if (CONFIG.feeToken) {
        const token = new ethers.Contract(CONFIG.feeToken, ERC20_ABI, prov);
        const bal = await token.balanceOf(address);
        setUserBalance(ethers.formatUnits(bal, 18));
      }

      return { provider: prov, signer: signerObj, address };
    } catch (error) {
      toast.error("Connect failed: " + error.message);
      return null;
    }
  }, [getProvider]);

  // ── Network & Account Listeners ──
  useEffect(() => {
    if (!window.ethereum) return;
    const handleChainChanged = () => window.location.reload();
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setUserAddress("");
        setProvider(null);
        setSigner(null);
        toast.warning("Wallet disconnected");
      } else {
        connectWallet();
      }
    };
    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum.removeListener("chainChanged", handleChainChanged);
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [connectWallet]);

  // ── Fetch Token Info ──
  const fetchTokenInfo = useCallback(async (tokenAddress) => {
    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      setTokenInfo({ address: "", name: "", symbol: "", decimals: 18, totalSupply: "0", balance: "0", isVerified: false });
      return;
    }
    try {
      const prov = getProvider();
      if (!prov) return;
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, prov);
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        token.name().catch(() => "Unknown"),
        token.symbol().catch(() => "???"),
        token.decimals().catch(() => 18),
        token.totalSupply().catch(() => 0n),
      ]);
      let balance = "0";
      if (userAddress) {
        const bal = await token.balanceOf(userAddress).catch(() => 0n);
        balance = ethers.formatUnits(bal, decimals);
      }
      setTokenInfo({
        address: tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        balance,
        isVerified: true,
      });
    } catch (error) {
      toast.error("Token fetch error");
    }
  }, [userAddress, getProvider]);

  // ── Check Fee Token Allowance ──
  const checkFeeAllowance = useCallback(async () => {
    if (!userAddress || !CONFIG.feeToken) return;
    try {
      const prov = getProvider();
      if (!prov) return;
      const token = new ethers.Contract(CONFIG.feeToken, ERC20_ABI, prov);
      const allowance = await token.allowance(userAddress, CONFIG.factoryAddress);
      const feeAmt = ethers.parseUnits(CONFIG.feeAmount, 18);
      setFeeApproved(allowance >= feeAmt);
    } catch {}
  }, [userAddress, getProvider]);

  // ── Calculations ──
  useEffect(() => {
    const hard = parseFloat(params.hardCap) || 0;
    const presaleRate = parseFloat(params.presaleRate) || 0;
    const listingRate = parseFloat(params.listingRate) || presaleRate || 1;
    const liqPerc = parseFloat(params.liquidityPercent) || 70;
    const decimals = tokenInfo.decimals || 18;

    const liqBNB = hard * (liqPerc / 100);
    setLiquidityBNB(liqBNB.toFixed(4));

    const presaleTokensNum = hard * presaleRate;
    setPresaleTokens(presaleTokensNum.toString());

    const liquidityTokensNum = liqBNB * listingRate;
    setLiquidityTokens(liquidityTokensNum.toString());

    const total = presaleTokensNum + liquidityTokensNum;
    setTotalDeposit(total.toString());

    try {
      setPresaleTokensWei(ethers.parseUnits(presaleTokensNum.toString(), decimals).toString());
      setLiquidityTokensWei(ethers.parseUnits(liquidityTokensNum.toString(), decimals).toString());
      setTotalDepositWei(ethers.parseUnits(total.toString(), decimals).toString());
    } catch {
      setPresaleTokensWei("0");
      setLiquidityTokensWei("0");
      setTotalDepositWei("0");
    }

    setLpTokens(liquidityTokensNum.toLocaleString());

    if (presaleRate > 0) {
      const rateWei = ethers.parseUnits(presaleRate.toString(), 18);
      const numerator = ethers.parseEther("1") * 1000000000000000000n;
      const price = numerator / rateWei;
      setPricePerTokenWei(price.toString());
    } else {
      setPricePerTokenWei("0");
    }

    const tokenPrice = listingRate > 0 ? (bnbPrice / listingRate) : 0;
    setTokenPriceUsd(tokenPrice.toFixed(6));

    const totalSupplyNum = parseFloat(tokenInfo.totalSupply) || 0;
    setEstimatedMC((tokenPrice * totalSupplyNum).toFixed(0));
    setFdv((tokenPrice * totalSupplyNum).toFixed(0));

    const raise = hard > 0 ? (hard * bnbPrice) : 0;
    setEstimatedRaise(raise.toFixed(0));

    // LP Lock end date
    if (params.liquidityLockTime) {
      const now = new Date();
      const lockDays = parseInt(params.liquidityLockTime) || 0;
      now.setDate(now.getDate() + lockDays);
      setLpLockEndDate(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    } else {
      setLpLockEndDate("N/A");
    }
  }, [params, tokenInfo, bnbPrice]);

  // ── Check Fee Allowance on mount ──
  useEffect(() => {
    if (userAddress) checkFeeAllowance();
  }, [userAddress, checkFeeAllowance]);

  // ── Input Handlers ──
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTokenAddressChange = (e) => {
    const address = e.target.value;
    setTokenInfo(prev => ({ ...prev, address }));
    if (address.length === 42 && ethers.isAddress(address)) {
      fetchTokenInfo(address);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const requireWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask install karo!");
      return null;
    }
    if (!userAddress) return await connectWallet();
    if (Number(networkId) !== CONFIG.chainId) {
      toast.error(`Please switch to BSC (chainId ${CONFIG.chainId})`);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${CONFIG.chainId.toString(16)}` }],
        });
        return await connectWallet();
      } catch {
        return null;
      }
    }
    return { provider, signer, address: userAddress };
  };

  // ── Error Parser ──
  const parseError = (error) => {
    if (error.code === "ACTION_REJECTED" || error.code === 4001) return "Transaction rejected by user";
    if (error.code === "INSUFFICIENT_FUNDS") return "Insufficient funds to pay gas";
    if (error.code === "UNPREDICTABLE_GAS_LIMIT") return "Gas estimation failed";
    if (error.message.includes("execution reverted")) return "Contract execution reverted";
    return error.message || "Transaction failed";
  };

  // ── Approve Fee ──
  const handleApproveFee = async () => {
    if (txPending) return;
    const wallet = await requireWallet();
    if (!wallet) return;
    setTxPending(true);
    setLoading(true);
    try {
      const { signer: s } = wallet;
      const feeContract = new ethers.Contract(CONFIG.feeToken, ERC20_ABI, s);
      const feeAmt = ethers.parseUnits(CONFIG.feeAmount, 18);
      const allowance = await feeContract.allowance(userAddress, CONFIG.factoryAddress);
      if (allowance >= feeAmt) {
        setFeeApproved(true);
        toast.success("Fee already approved!");
        setTxPending(false);
        setLoading(false);
        return;
      }
      const tx = await feeContract.approve(CONFIG.factoryAddress, feeAmt);
      await tx.wait();
      setFeeApproved(true);
      toast.success("Fee approved!");
    } catch (error) {
      toast.error("Approve fee failed: " + parseError(error));
    } finally {
      setLoading(false);
      setTxPending(false);
    }
  };

  // ── Validation ──
  const validateForm = () => {
    const errors = [];
    if (!tokenInfo.address || !ethers.isAddress(tokenInfo.address)) errors.push("Invalid token address");

    // Common validations
    if (!params.startDate) errors.push("Start date required");
    if (!params.endDate) errors.push("End date required");
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    if (start >= end) errors.push("End date must be after start date");
    if (start <= new Date()) errors.push("Start date must be in future");

    if (launchType === "presale") {
      const soft = parseFloat(params.softCap);
      const hard = parseFloat(params.hardCap);
      const min = parseFloat(params.minBuy);
      const max = parseFloat(params.maxBuy);
      const rate = parseFloat(params.presaleRate);
      const listing = parseFloat(params.listingRate);
      const liqPerc = parseFloat(params.liquidityPercent);
      const tge = parseFloat(params.tgePercent);
      const unlock = parseFloat(params.unlockPercent);

      if (soft <= 0) errors.push("Soft cap must be > 0");
      if (hard <= 0) errors.push("Hard cap must be > 0");
      if (soft >= hard) errors.push("Hard cap must be > soft cap");
      if (min <= 0) errors.push("Min buy must be > 0");
      if (min >= max) errors.push("Max buy must be > min buy");
      if (listing >= rate) errors.push("Listing rate must be lower than presale rate");
      if (liqPerc < 50 || liqPerc > 100) errors.push("Liquidity % must be between 50 and 100");
      if (params.enableVesting && tge + unlock > 100) errors.push("TGE + Unlock per Cycle must be ≤ 100");
    }

    if (launchType === "fairlaunch") {
      if (parseFloat(params.startingPrice) <= 0) errors.push("Starting price must be > 0");
      if (parseFloat(params.priceIncrement) <= 0) errors.push("Price increment must be > 0");
      if (parseFloat(params.totalSupplyCurve) <= 0) errors.push("Total supply for curve must be > 0");
      if (parseFloat(params.maxContribution) <= 0) errors.push("Max contribution must be > 0");
    }

    const reqNum = parseFloat(totalDeposit) || 0;
    const balNum = parseFloat(tokenInfo.balance) || 0;
    if (reqNum > balNum) errors.push(`Insufficient balance: need ${totalDeposit} tokens, have ${tokenInfo.balance}`);

    if (errors.length > 0) {
      toast.error(errors.join(" | "));
      return false;
    }
    return true;
  };

  // ── Confirm Launch ──
  const handleConfirmLaunch = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  // ── Create Presale / Fairlaunch ──
  const handleCreatePresale = async () => {
    setShowConfirmModal(false);
    if (txPending) return;
    const wallet = await requireWallet();
    if (!wallet) return;
    if (!feeApproved) {
      toast.error("Pehle fee approve karo!");
      return;
    }
    setTxPending(true);
    setLoading(true);
    try {
      const { signer: s } = wallet;

      const saleToken = tokenInfo.address;
      const paymentToken = ethers.ZeroAddress;
      const startTime = Math.floor(new Date(params.startDate).getTime() / 1000);
      const endTime = Math.floor(new Date(params.endDate).getTime() / 1000);
      const whitelistEnabled = params.whitelistEnabled;

      let tx;
      let receipt;
      let presaleAddr = "";
      let id = "";

      if (launchType === "presale") {
        const factory = new ethers.Contract(CONFIG.factoryAddress, FACTORY_ABI, s);
        tx = await factory.createPresale(
          saleToken,
          paymentToken,
          pricePerTokenWei,
          ethers.parseEther(params.softCap || "0"),
          ethers.parseEther(params.hardCap || "0"),
          ethers.parseEther(params.minBuy || "0"),
          ethers.parseEther(params.maxBuy || "0"),
          startTime,
          endTime,
          whitelistEnabled,
          params.enableVesting ? parseFloat(params.cliffPeriod) * 86400 : 0,
          params.enableVesting ? parseFloat(params.vestingDuration) * 86400 : 0,
          params.enableVesting ? parseFloat(params.tgePercent) : 0
        );
        receipt = await tx.wait();

        for (const log of receipt.logs) {
          try {
            const parsed = factory.interface.parseLog(log);
            if (parsed && parsed.name === "PresaleDeployed") {
              presaleAddr = parsed.args.presaleAddress;
              id = parsed.args.presaleId.toString();
              break;
            }
          } catch {}
        }

      } else if (launchType === "fairlaunch") {
        const fairFactory = new ethers.Contract(CONFIG.fairLaunchFactory, FAIR_LAUNCH_ABI, s);
        tx = await fairFactory.createFairLaunch(
          saleToken,
          paymentToken,
          ethers.parseEther(params.startingPrice || "0"),
          ethers.parseEther(params.priceIncrement || "0"),
          ethers.parseEther(params.totalSupplyCurve || "0"),
          ethers.parseEther(params.maxContribution || "0"),
          startTime,
          endTime,
          whitelistEnabled
        );
        receipt = await tx.wait();

        for (const log of receipt.logs) {
          try {
            const parsed = fairFactory.interface.parseLog(log);
            if (parsed && parsed.name === "FairLaunchDeployed") {
              presaleAddr = parsed.args.launchAddress;
              id = parsed.args.launchId.toString();
              break;
            }
          } catch {}
        }
      } else {
        throw new Error("Unknown launch type");
      }

      if (!presaleAddr) throw new Error("Contract event not found");

      setPresaleAddress(presaleAddr);
      setPresaleId(id);

      const pContract = new ethers.Contract(presaleAddr, PRESALE_ABI, s);
      presaleContractRef.current = pContract;
      setPresaleContract(pContract);

      if (whitelistEnabled && params.whitelistAddresses) {
        const addresses = params.whitelistAddresses.split(",").map(a => a.trim());
        const valid = addresses.filter(a => ethers.isAddress(a));
        if (valid.length > 0) {
          try {
            await pContract.setWhitelist(valid, true);
            toast.success(`Added ${valid.length} whitelist addresses`);
          } catch {}
        }
      }

      toast.success(`${selectedLaunch.name} deployed at ${presaleAddr}`);
      setStep(4);
    } catch (error) {
      toast.error("Create failed: " + parseError(error));
    } finally {
      setLoading(false);
      setTxPending(false);
    }
  };

  // ── Approve Token for Deposit ──
  const handleApproveToken = async () => {
    if (txPending) return;
    if (!presaleAddress) { toast.error("Presale not created"); return; }
    const wallet = await requireWallet();
    if (!wallet) return;
    setTxPending(true);
    setLoading(true);
    try {
      const { signer: s } = wallet;
      const token = new ethers.Contract(tokenInfo.address, ERC20_ABI, s);
      const amount = BigInt(totalDepositWei);
      const allowance = await token.allowance(userAddress, presaleAddress);
      if (allowance >= amount) {
        setTokenApproved(true);
        toast.success("Token already approved!");
        setTxPending(false);
        setLoading(false);
        return;
      }
      const tx = await token.approve(presaleAddress, amount);
      await tx.wait();
      setTokenApproved(true);
      toast.success("Token approved for deposit");
    } catch (error) {
      toast.error("Approve token failed: " + parseError(error));
    } finally {
      setLoading(false);
      setTxPending(false);
    }
  };

  // ── Deposit Tokens ──
  const handleDeposit = async () => {
    if (txPending) return;
    const contract = presaleContractRef.current || presaleContract;
    if (!contract) { toast.error("No presale contract"); return; }
    if (!tokenApproved) { toast.error("Pehle token approve karo"); return; }
    const wallet = await requireWallet();
    if (!wallet) return;
    setTxPending(true);
    setLoading(true);
    try {
      const amount = BigInt(totalDepositWei);
      const tx = await contract.depositTokens(amount);
      await tx.wait();
      setDeposited(true);
      toast.success(`${totalDeposit} tokens deposited!`);
      if (tokenInfo.address && signer) {
        const token = new ethers.Contract(tokenInfo.address, ERC20_ABI, signer);
        const bal = await token.balanceOf(userAddress);
        setTokenInfo(prev => ({
          ...prev,
          balance: ethers.formatUnits(bal, tokenInfo.decimals)
        }));
      }
      setStep(5);
    } catch (error) {
      toast.error("Deposit failed: " + parseError(error));
    } finally {
      setLoading(false);
      setTxPending(false);
    }
  };

  // ── Live Data Polling ──
  useEffect(() => {
    const contract = presaleContractRef.current || presaleContract;
    if (contract && presaleAddress) {
      const fetchData = async () => {
        try {
          const raised = await contract.totalRaised();
          const hard = await contract.hardCap();
          const participantsCount = await contract.totalParticipants().catch(() => 0);
          setParticipants(Number(participantsCount));
          const raisedBNB = Number(ethers.formatEther(raised));
          const hardBNB = Number(ethers.formatEther(hard));
          setRaisedAmount(raisedBNB.toFixed(4));
          if (hardBNB > 0) {
            setProgress((raisedBNB / hardBNB) * 100);
          } else {
            setProgress(0);
          }
        } catch {}
      };
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [presaleContract, presaleAddress]);

  // ── Reset ──
  const resetAll = () => {
    setStep(1);
    setPresaleAddress("");
    setDeposited(false);
    setTokenApproved(false);
    setFeeApproved(false);
    setPresaleId(null);
    setPresaleContract(null);
    presaleContractRef.current = null;
    setRaisedAmount("0");
    setProgress(0);
    setTxPending(false);
    setParams(INITIAL_PARAMS);
  };

  // ─── CONFIRMATION MODAL ────────────────────────────────────────
  const ConfirmationModal = () => {
    if (!showConfirmModal) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <FaExclamationTriangle className="modal-icon" />
            <h3>Confirm Launch</h3>
          </div>
          <div className="modal-body">
            <p>Once created, <strong>parameters cannot be changed</strong>.</p>
            <ul>
              <li><span>Token:</span> <strong>{tokenInfo.symbol}</strong></li>
              <li><span>Launch Type:</span> <strong>{selectedLaunch.name}</strong></li>
              <li><span>Hard Cap:</span> <strong>{params.hardCap || "N/A"} BNB</strong></li>
              <li><span>Fee:</span> <strong>{selectedFee}</strong></li>
              <li><span>Total Deposit:</span> <strong>{totalDeposit} {tokenInfo.symbol}</strong></li>
              <li><span>LP Lock:</span> <strong>{params.liquidityLockTime} days</strong></li>
            </ul>
            <div className="modal-warning">
              <FaInfoCircle /> This action cannot be undone.
            </div>
          </div>
          <div className="modal-footer">
            <button className="secondary-btn" onClick={() => setShowConfirmModal(false)}>Cancel</button>
            <button className="primary-btn" onClick={handleCreatePresale} disabled={loading}>
              {loading ? <FaSpinner className="spin" /> : "🚀 Confirm Launch"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Continue to Part 2 for Render Functions ────────────
  // ──────────────────────────────────────────────────────────────
//  pages/CreatePresale.jsx – PART 2
//  Render Functions: Step 1 to Step 5 + Main Return
// ──────────────────────────────────────────────────────────────

  // ─── RENDER FUNCTIONS ─────────────────────────────────────────

  // ── Step 1: Launch Type Selection ──
  const renderStep1 = () => {
    const handleCardClick = (typeId) => {
      if (typeId === "presale" || typeId === "fairlaunch") {
        setLaunchType(typeId);
        setStep(2);
      } else {
        toast.info("🚧 Coming Soon! Only Presale and Fairlaunch are available in V1.");
      }
    };

    return (
      <div className="selection-area">
        <div className="section-header">
          <h2>Select Launch Type</h2>
          <p>Each model has its own configuration – choose the best fit for your project</p>
        </div>
        <div className="launch-grid">
          {launchTypes.map((type) => {
            const isActive = launchType === type.id;
            const isComingSoon = type.id !== "presale" && type.id !== "fairlaunch";

            return (
              <div
                key={type.id}
                className={`launch-card ${isActive ? "active" : ""} ${isComingSoon ? "coming-soon" : ""}`}
                onClick={() => handleCardClick(type.id)}
              >
                {isComingSoon && (
                  <div className="coming-soon-badge">
                    <FaGem /> Coming Soon
                  </div>
                )}
                <div className="launch-card-icon">{type.icon}</div>
                <h4>{type.name}</h4>
                <p>{type.desc}</p>
                <div className="launch-features">
                  {type.features.map((f, i) => (
                    <span key={i} className="feature-tag">✓ {f}</span>
                  ))}
                </div>
                <div className="launch-card-footer">
                  <span className="launch-fee">{type.fee}</span>
                  {type.badge && <span className="launch-badge">{type.badge}</span>}
                </div>

                {/* Verify Contract Button – Presale */}
                {type.id === "presale" && (
                  <div className="verify-link-wrapper">
                    <button
                      className="verify-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://bscscan.com/address/${CONFIG.factoryAddress}#code`, "_blank");
                      }}
                      title="View and verify the presale contract source code on BscScan"
                    >
                      <FaExternalLinkAlt /> Verify Contract
                    </button>
                  </div>
                )}

                {/* Verify Contract Button – Fairlaunch */}
                {type.id === "fairlaunch" && (
                  <div className="verify-link-wrapper">
                    <button
                      className="verify-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://bscscan.com/address/${CONFIG.fairLaunchFactory}#code`, "_blank");
                      }}
                      title="View and verify the fairlaunch contract source code on BscScan"
                    >
                      <FaExternalLinkAlt /> Verify Contract
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="selection-footer">
          <div className="selected-info">
            <span className="label">Selected</span>
            <span className="value" style={{ color: selectedLaunch.color }}>
              {selectedLaunch.name}
            </span>
          </div>
          {(launchType === "presale" || launchType === "fairlaunch") && (
            <button className="primary-btn" onClick={() => setStep(2)}>
              Continue <FaArrowRight />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Step 2: Token & Presale Details ──
  const renderStep2 = () => {
    // ── FAIRLAUNCH FORM ──
    if (launchType === "fairlaunch") {
      return (
        <div className="form-area">
          <div className="form-sections">
            {/* Token Info Card */}
            <div className="form-card">
              <div className="card-header">
                <FaCoins className="card-icon" />
                <h4>Token Information</h4>
              </div>
              <div className="card-body">
                <div className="form-group full-width">
                  <label>Token Address *</label>
                  <div className="input-with-actions">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={tokenInfo.address}
                      onChange={handleTokenAddressChange}
                    />
                    <button className="action-btn" onClick={() => handleCopy(tokenInfo.address)}><FaCopy /></button>
                    <button className="action-btn" onClick={() => window.open(`https://bscscan.com/token/${tokenInfo.address}`, "_blank")}><FaExternalLinkAlt /></button>
                  </div>
                  <div className="token-status">
                    {tokenInfo.isVerified && <span className="status-badge verified">✅ Verified</span>}
                    <span className="status-badge info">🔍 {tokenInfo.symbol}</span>
                    <span className="status-badge info">📊 {tokenInfo.decimals} decimals</span>
                  </div>
                </div>
                {tokenInfo.name && (
                  <div className="token-preview">
                    <div className="preview-row"><span>Name:</span> <strong>{tokenInfo.name}</strong></div>
                    <div className="preview-row"><span>Symbol:</span> <strong>{tokenInfo.symbol}</strong></div>
                    <div className="preview-row"><span>Total Supply:</span> <strong>{tokenInfo.totalSupply}</strong></div>
                    <div className="preview-row"><span>Your Balance:</span> <strong>{tokenInfo.balance}</strong></div>
                    <div className="preview-row highlight"><span>Required Deposit:</span> <strong>{totalDeposit} {tokenInfo.symbol}</strong></div>
                  </div>
                )}
              </div>
            </div>

            {/* Fairlaunch Settings Card */}
            <div className="form-card">
              <div className="card-header">
                <FaChartLine className="card-icon" />
                <h4>Fairlaunch Settings (Bonding Curve)</h4>
              </div>
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
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Price Increment per BNB *</label>
                    <input
                      type="number"
                      step="0.0001"
                      name="priceIncrement"
                      placeholder="0.0001"
                      value={params.priceIncrement}
                      onChange={handleInputChange}
                    />
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
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Contribution (BNB) *</label>
                    <input
                      type="number"
                      name="maxContribution"
                      placeholder="5"
                      value={params.maxContribution}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Price Projection */}
                {parseFloat(params.startingPrice) > 0 && parseFloat(params.priceIncrement) > 0 && (
                  <div className="fairlaunch-preview">
                    <h6>📊 Price Projection</h6>
                    <div className="preview-grid">
                      <div className="preview-item">
                        <span className="label">Starting Price:</span>
                        <span className="value gold">{parseFloat(params.startingPrice).toFixed(4)} BNB</span>
                      </div>
                      <div className="preview-item">
                        <span className="label">After 10 BNB raised:</span>
                        <span className="value gold">{(parseFloat(params.startingPrice) + parseFloat(params.priceIncrement) * 10).toFixed(4)} BNB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Card */}
            <div className="form-card">
              <div className="card-header">
                <FaClock className="card-icon" />
                <h4>Timeline</h4>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="datetime-local"
                      name="startDate"
                      value={params.startDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date *</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      value={params.endDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Whitelist Card */}
            <div className="form-card">
              <div className="card-header">
                <FaUsers className="card-icon" />
                <h4>Whitelist</h4>
              </div>
              <div className="card-body">
                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="whitelistEnabled"
                      checked={params.whitelistEnabled}
                      onChange={handleInputChange}
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
                      onChange={handleInputChange}
                    />
                    <small className="helper-text">Comma separated addresses</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-navigation">
            <button className="secondary-btn" onClick={() => setStep(1)}>← Back</button>
            <button className="primary-btn" onClick={() => setStep(3)}>Next: Review →</button>
          </div>
        </div>
      );
    }

    // ── PRESALE FORM ──
    const commonFields = (
      <div className="form-row">
        <div className="form-group">
          <label>Start Date *</label>
          <input type="datetime-local" name="startDate" value={params.startDate} onChange={handleInputChange} />
        </div>
        <div className="form-group">
          <label>End Date *</label>
          <input type="datetime-local" name="endDate" value={params.endDate} onChange={handleInputChange} />
        </div>
      </div>
    );

    const presaleFields = (
      <>
        <div className="form-row">
          <div className="form-group">
            <label>Presale Rate (tokens/BNB) *</label>
            <input type="number" name="presaleRate" placeholder="1000" value={params.presaleRate} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Listing Rate (tokens/BNB) *</label>
            <input type="number" name="listingRate" placeholder="800" value={params.listingRate} onChange={handleInputChange} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Soft Cap (BNB) *</label>
            <input type="number" name="softCap" placeholder="10" value={params.softCap} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Hard Cap (BNB) *</label>
            <input type="number" name="hardCap" placeholder="20" value={params.hardCap} onChange={handleInputChange} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Min Buy (BNB) *</label>
            <input type="number" name="minBuy" placeholder="0.1" value={params.minBuy} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Max Buy (BNB) *</label>
            <input type="number" name="maxBuy" placeholder="2" value={params.maxBuy} onChange={handleInputChange} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Refund Type</label>
            <select name="refundType" value={params.refundType} onChange={handleInputChange}>
              <option value="refund">Refund</option>
              <option value="burn">Burn</option>
            </select>
          </div>
          <div className="form-group">
            <label>Unsold Tokens</label>
            <select name="unsoldTokens" value={params.unsoldTokens} onChange={handleInputChange}>
              <option value="burn">Burn</option>
              <option value="refund">Refund</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Liquidity Allocation (%)</label>
            <input type="number" name="liquidityPercent" placeholder="70" value={params.liquidityPercent} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Liquidity Lock (days)</label>
            <input type="number" name="liquidityLockTime" placeholder="365" value={params.liquidityLockTime} onChange={handleInputChange} />
          </div>
        </div>
        <div className="form-group full-width">
          <label className="checkbox-label">
            <input type="checkbox" name="enableVesting" checked={params.enableVesting} onChange={handleInputChange} />
            Enable Vesting
          </label>
        </div>
        {params.enableVesting && (
          <div className="form-row">
            <div className="form-group">
              <label>TGE Release (%)</label>
              <input type="number" name="tgePercent" value={params.tgePercent} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Cliff Period (days)</label>
              <input type="number" name="cliffPeriod" value={params.cliffPeriod} onChange={handleInputChange} />
            </div>
          </div>
        )}
      </>
    );

    return (
      <div className="form-area">
        <div className="form-sections">
          {/* Token Info Card */}
          <div className="form-card">
            <div className="card-header">
              <FaCoins className="card-icon" />
              <h4>Token Information</h4>
            </div>
            <div className="card-body">
              <div className="form-group full-width">
                <label>Token Address *</label>
                <div className="input-with-actions">
                  <input type="text" placeholder="0x..." value={tokenInfo.address} onChange={handleTokenAddressChange} />
                  <button className="action-btn" onClick={() => handleCopy(tokenInfo.address)}><FaCopy /></button>
                  <button className="action-btn" onClick={() => window.open(`https://bscscan.com/token/${tokenInfo.address}`, "_blank")}><FaExternalLinkAlt /></button>
                </div>
                <div className="token-status">
                  {tokenInfo.isVerified && <span className="status-badge verified">✅ Verified</span>}
                  <span className="status-badge info">🔍 {tokenInfo.symbol}</span>
                  <span className="status-badge info">📊 {tokenInfo.decimals} decimals</span>
                </div>
              </div>
              {tokenInfo.name && (
                <div className="token-preview">
                  <div className="preview-row"><span>Name:</span> <strong>{tokenInfo.name}</strong></div>
                  <div className="preview-row"><span>Symbol:</span> <strong>{tokenInfo.symbol}</strong></div>
                  <div className="preview-row"><span>Total Supply:</span> <strong>{tokenInfo.totalSupply}</strong></div>
                  <div className="preview-row"><span>Your Balance:</span> <strong>{tokenInfo.balance}</strong></div>
                  <div className="preview-row highlight"><span>Required Deposit:</span> <strong>{totalDeposit} {tokenInfo.symbol}</strong></div>
                </div>
              )}
            </div>
          </div>

          {/* Presale Settings Card */}
          <div className="form-card">
            <div className="card-header">
              <FaChartLine className="card-icon" />
              <h4>Presale Settings</h4>
            </div>
            <div className="card-body">
              {presaleFields}
              {commonFields}
            </div>
          </div>

          {/* Liquidity & LP Creation Card */}
          <div className="form-card liquidity-card">
            <div className="card-header clickable" onClick={() => toggleSection('liquidity')}>
              <FaLock className="card-icon" />
              <h4>Liquidity Lock & LP Creation</h4>
              <span className="card-toggle">
                {collapsedSections.liquidity ? <FaChevronDown /> : <FaChevronUp />}
              </span>
            </div>
            {!collapsedSections.liquidity && (
              <div className="card-body">
                <div className="liquidity-preview">
                  <div className="preview-row"><span>Liquidity BNB:</span> <strong>{liquidityBNB} BNB</strong></div>
                  <div className="preview-row"><span>LP Tokens:</span> <strong>{lpTokens}</strong></div>
                  <div className="preview-row"><span>Lock Duration:</span> <strong>{params.liquidityLockTime} days</strong></div>
                  <div className="preview-row"><span>Lock Ends On:</span> <strong>{lpLockEndDate}</strong></div>
                </div>
                <div className="lp-preview">
                  <span className="lp-badge"><FaLock /> Locked for {params.liquidityLockTime} days</span>
                  <span className="lp-badge info"><FaInfoCircle /> Auto LP creation after finalize</span>
                </div>
                <div className="lp-status-bar">
                  <span className="status-dot active"></span>
                  <span className="status-text">LP will be created & locked automatically upon presale finalization</span>
                </div>
                <button className="secondary-btn" style={{ width: '100%', marginTop: '10px' }} disabled>
                  ⚡ LP Creation & Lock (Auto-enabled after presale ends)
                </button>
              </div>
            )}
          </div>

          {/* Whitelist Card */}
          <div className="form-card">
            <div className="card-header">
              <FaUsers className="card-icon" />
              <h4>Whitelist</h4>
            </div>
            <div className="card-body">
              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input type="checkbox" name="whitelistEnabled" checked={params.whitelistEnabled} onChange={handleInputChange} />
                  Enable Whitelist
                </label>
              </div>
              {params.whitelistEnabled && (
                <div className="form-group full-width">
                  <label>Whitelist Addresses</label>
                  <input type="text" name="whitelistAddresses" placeholder="0x...,0x..." value={params.whitelistAddresses} onChange={handleInputChange} />
                  <small className="helper-text">Comma separated addresses</small>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-navigation">
          <button className="secondary-btn" onClick={() => setStep(1)}>← Back</button>
          <button className="primary-btn" onClick={() => setStep(3)}>Next: Vesting →</button>
        </div>
      </div>
    );
  };

  // ── Step 3: Vesting ──
  const renderStep3 = () => {
    return (
      <div className="form-area">
        <div className="form-sections">
          <div className="form-card">
            <div className="card-header">
              <FaPercent className="card-icon" />
              <h4>Vesting</h4>
            </div>
            <div className="card-body">
              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input type="checkbox" name="enableVesting" checked={params.enableVesting} onChange={handleInputChange} />
                  Enable Vesting
                </label>
              </div>
              {params.enableVesting && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>TGE Release (%)</label>
                      <input type="number" name="tgePercent" value={params.tgePercent} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Cliff Period (days)</label>
                      <input type="number" name="cliffPeriod" value={params.cliffPeriod} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Vesting Duration (days)</label>
                      <input type="number" name="vestingDuration" placeholder="180" value={params.vestingDuration} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label>Unlock per Cycle (%) <span className="ui-only">(UI only)</span></label>
                      <input type="number" name="unlockPercent" value={params.unlockPercent} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="vesting-preview">
                    <h6>📈 Vesting Timeline</h6>
                    <div className="timeline-bars">
                      <div className="bar tge" style={{width: `${params.tgePercent}%`}}>TGE {params.tgePercent}%</div>
                      <div className="bar cycle" style={{width: `${params.unlockPercent}%`}}>Cycle {params.unlockPercent}%</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="form-card">
            <div className="card-header">
              <FaLock className="card-icon" />
              <h4>Liquidity Lock</h4>
            </div>
            <div className="card-body">
              <div className="liquidity-preview">
                <div className="preview-row"><span>Liquidity BNB:</span> <strong>{liquidityBNB} BNB</strong></div>
                <div className="preview-row"><span>LP Tokens:</span> <strong>{lpTokens}</strong></div>
                <div className="preview-row"><span>Lock Duration:</span> <strong>{params.liquidityLockTime} days</strong></div>
                <div className="preview-row"><span>Lock Ends On:</span> <strong>{lpLockEndDate}</strong></div>
              </div>
              <div className="form-group full-width">
                <label>LP Creation</label>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Upon presale finalization, LP tokens will be automatically created and locked for {params.liquidityLockTime} days.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="form-navigation">
          <button className="secondary-btn" onClick={() => setStep(2)}>← Back</button>
          <button className="primary-btn" onClick={() => setStep(4)}>Next: Review →</button>
        </div>
      </div>
    );
  };

  // ── Step 4: Review & Launch ──
  const renderStep4 = () => {
    const startDate = params.startDate ? new Date(params.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
    const endDate = params.endDate ? new Date(params.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';

    return (
      <div className="review-area">
        <div className="review-grid">
          <div className="summary-card">
            <div className="summary-header">
              <div className="presale-badge">
                <span className="badge-launch" style={{ background: selectedLaunch.color }}>{selectedLaunch.icon} {selectedLaunch.name}</span>
                <span className="badge-status">🟢 Upcoming</span>
              </div>
              <div className="token-logo">
                <div className="logo-placeholder">
                  {tokenInfo.symbol ? tokenInfo.symbol[0] : '?'}
                </div>
                <div className="token-meta">
                  <strong>{tokenInfo.symbol || 'Token'}</strong>
                  <span>{tokenInfo.name || '...'}</span>
                </div>
              </div>
            </div>

            <div className="summary-stats">
              <div className="stat-item"><span className="stat-label">Start</span><span className="stat-value">{startDate}</span></div>
              <div className="stat-item"><span className="stat-label">End</span><span className="stat-value">{endDate}</span></div>
              <div className="stat-item"><span className="stat-label">Participants</span><span className="stat-value">{participants || '0'}</span></div>
              <div className="stat-item"><span className="stat-label">Raised</span><span className="stat-value">{raisedAmount || '0'} / {params.hardCap || '0'} BNB</span></div>
            </div>

            <div className="summary-divider" />
            <div className="summary-row"><span>Soft/Hard Cap:</span> <strong>{params.softCap || 0} / {params.hardCap || 0} BNB</strong></div>
            <div className="summary-row"><span>Presale Rate:</span> <strong>{params.presaleRate} tokens/BNB</strong></div>
            <div className="summary-row"><span>Listing Rate:</span> <strong>{params.listingRate} tokens/BNB</strong></div>
            <div className="summary-row"><span>Min/Max Buy:</span> <strong>{params.minBuy || 0} / {params.maxBuy || 0} BNB</strong></div>
            <div className="summary-divider" />
            <div className="summary-row"><span>Vesting:</span> <strong>{params.enableVesting ? "✅ Enabled" : "❌ Disabled"}</strong></div>
            <div className="summary-row"><span>Whitelist:</span> <strong>{params.whitelistEnabled ? "✅ Yes" : "❌ No"}</strong></div>
            <div className="summary-divider" />
            <div className="summary-row highlight-row"><span>Total Deposit:</span> <strong className="highlight">{totalDeposit} {tokenInfo.symbol}</strong></div>
            <div className="summary-row highlight-row"><span>Estimated Raise:</span> <strong>${estimatedRaise}</strong></div>
            <div className="summary-row highlight-row"><span>LP Lock Duration:</span> <strong>{params.liquidityLockTime} days</strong></div>
          </div>

          <div className="preview-card">
            <h4>📊 Live Preview</h4>
            <div className="preview-charts">
              <div className="pie-container">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={[
                      { name: "Liquidity", value: parseFloat(params.liquidityPercent) || 70 },
                      { name: "Vesting", value: params.enableVesting ? parseFloat(params.tgePercent) || 0 : 0 },
                      { name: "Team/Reserve", value: 100 - (parseFloat(params.liquidityPercent) || 70) - (params.enableVesting ? parseFloat(params.tgePercent) || 0 : 0) }
                    ]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label>
                      {['#D4AF37', '#2d7dd2', '#4caf50'].map((color, i) => <Cell key={i} fill={color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="progress-bar">
                <label>Progress: {progress.toFixed(1)}%</label>
                <div className="progress-track"><div className="progress-fill" style={{width: `${Math.min(progress, 100)}%`}} /></div>
              </div>
              <div className="price-preview">
                <div className="preview-item"><span className="label">Token Price:</span> <span className="value">${tokenPriceUsd}</span></div>
                <div className="preview-item"><span className="label">Est. MC:</span> <span className="value">${estimatedMC}</span></div>
                <div className="preview-item"><span className="label">FDV:</span> <span className="value">${fdv}</span></div>
                <div className="preview-item"><span className="label">LP Tokens:</span> <span className="value">{lpTokens}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="fee-summary">
          <div className="fee-header">
            <div className="fee-info">
              <span className="fee-label">💳 Launch Fee</span>
              <span className="fee-amount">{selectedFee}</span>
            </div>
            <div className="fee-details">
              <span>Payment Token: <strong>SOLT</strong></span>
              <span>Your Balance: <strong>{userBalance || '0'} SOLT</strong></span>
            </div>
          </div>
          <div className="fee-note">⚠️ You must approve {selectedFee} spending.</div>
          {!feeApproved && (
            <button className="primary-btn fee-btn" onClick={handleApproveFee} disabled={loading || txPending}>
              {loading ? <FaSpinner className="spin" /> : `Approve ${selectedFee}`}
            </button>
          )}
          {feeApproved && <span className="status-ok">✅ Fee approved!</span>}
        </div>

        <div className="form-navigation">
          <button className="secondary-btn" onClick={() => setStep(3)}>← Back</button>
          <button className="primary-btn launch-btn" onClick={handleConfirmLaunch} disabled={loading || txPending || !feeApproved}>
            {loading ? <FaSpinner className="spin" /> : `🚀 Launch ${selectedLaunch.name}`}
          </button>
        </div>

        {presaleAddress && (
          <div className="deposit-area">
            <div className="deposit-card">
              <h5>📦 Presale Deployed</h5>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <code style={{ flex: '1', wordBreak: 'break-all' }}>{presaleAddress}</code>
                <button 
                  className="action-btn" 
                  onClick={() => window.open(`https://bscscan.com/address/${presaleAddress}#code`, "_blank")}
                  title="View contract source on BscScan"
                >
                  <FaExternalLinkAlt /> Verify
                </button>
              </p>
              <p>Total deposit required: <strong>{totalDeposit} {tokenInfo.symbol}</strong></p>
              {!tokenApproved && (
                <button className="secondary-btn" onClick={handleApproveToken} disabled={loading || txPending}>
                  Approve {totalDeposit} {tokenInfo.symbol}
                </button>
              )}
              {tokenApproved && !deposited && (
                <button className="primary-btn" onClick={handleDeposit} disabled={loading || txPending}>
                  Deposit {totalDeposit} {tokenInfo.symbol}
                </button>
              )}
              {deposited && <span className="status-ok">✅ Tokens deposited!</span>}
            </div>
          </div>
        )}

        <ConfirmationModal />
      </div>
    );
  };

  // ── Step 5: Success ──
  const renderStep5 = () => {
    const shareText = `🚀 Just launched my ${selectedLaunch.name} on SoltDex!\n\nToken: ${tokenInfo.symbol}\nType: ${selectedLaunch.name}\n${launchType === "presale" ? `Hard Cap: ${params.hardCap}` : `Bonding Curve`} BNB\n\n🔗 ${presaleAddress}\n\n#SoltDex #Crypto #${selectedLaunch.name}`;

    return (
      <div className="success-area">
        <div className="success-icon">🎉</div>
        <h2>{selectedLaunch.name} Created & Deposited!</h2>
        <p>Your {selectedLaunch.name} is now live. Share it with the community.</p>

        <div className="success-card">
          <div className="success-header">
            <div className="token-preview-badge">
              <div className="logo-small">{tokenInfo.symbol ? tokenInfo.symbol[0] : '?'}</div>
              <div>
                <div className="token-name">{tokenInfo.symbol || 'Token'}</div>
                <div className="token-type">{selectedLaunch.name} • {launchType === "presale" ? `${params.hardCap} BNB` : 'Bonding Curve'}</div>
              </div>
            </div>
            <span className="success-badge">✅ LIVE</span>
          </div>
          <div className="success-details">
            <div className="detail-row"><span>Contract:</span> <code>{presaleAddress}</code></div>
            <div className="detail-row"><span>Start:</span> <strong>{params.startDate ? new Date(params.startDate).toLocaleString() : 'TBD'}</strong></div>
            <div className="detail-row"><span>End:</span> <strong>{params.endDate ? new Date(params.endDate).toLocaleString() : 'TBD'}</strong></div>
            <div className="detail-row"><span>Deposited:</span> <strong>{totalDeposit} {tokenInfo.symbol}</strong></div>
          </div>
          <div className="success-actions">
            <button className="action-btn" onClick={() => handleCopy(presaleAddress)}>
              {copied ? <FaCheck color="green" /> : <FaCopy />} Copy
            </button>
            <button className="action-btn" onClick={() => window.open(`https://bscscan.com/address/${presaleAddress}`, "_blank")}>
              <FaExternalLinkAlt /> BscScan
            </button>
            <button className="action-btn" onClick={() => window.open(`https://bscscan.com/address/${presaleAddress}#code`, "_blank")}>
              <FaExternalLinkAlt /> Verify Contract
            </button>
            <button className="action-btn" onClick={() => window.open("https://pancakeswap.finance", "_blank")}>
              🥞 PancakeSwap
            </button>
          </div>
          <div className="share-buttons">
            <button className="share-btn x" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank")}>
              <FaTwitter /> Share on X
            </button>
            <button className="share-btn telegram" onClick={() => window.open(`https://t.me/share/url?url=${presaleAddress}&text=${encodeURIComponent(`🚀 Just launched my ${selectedLaunch.name} on SoltDex!`)}`, "_blank")}>
              <FaTelegram /> Share on Telegram
            </button>
          </div>
        </div>

        <button className="primary-btn" onClick={resetAll}>Create Another</button>
      </div>
    );
  };

  // ─── MAIN RENDER ──────────────────────────────────────────────
  return (
    <div className={`presale-creator ${isDarkMode ? "dark" : "light"}`}>
      <Toaster position="top-right" />
      <div className="container">
        <div className="header">
          <div className="header-left">
            <h1>🚀 Create Presale</h1>
          </div>
          <div className="header-actions">
            <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? "☀️" : "🌙"}
            </button>
            {userAddress && (
              <div className="wallet-badge">
                <FaWallet />
                <span>{userAddress.slice(0,6)}...{userAddress.slice(-4)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="wizard">
          <div className="step-indicator-wrapper">
            <div className="step-indicators">
              {[1, 2, 3, 4, 5].map(s => (
                <div
                  key={s}
                  className={`step-dot ${s === step ? "active" : s < step ? "completed" : ""}`}
                  onClick={() => s < step && setStep(s)}
                >
                  {s < step ? <FaCheck /> : <span>{s}</span>}
                </div>
              ))}
            </div>
            <div className="step-labels">
              <span className={step === 1 ? "active" : ""}>Select Type</span>
              <span className={step === 2 ? "active" : ""}>Details</span>
              <span className={step === 3 ? "active" : ""}>Vesting</span>
              <span className={step === 4 ? "active" : ""}>Review</span>
              <span className={step === 5 ? "active" : ""}>Success</span>
            </div>
          </div>

          <div className="step-content">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
          </div>
        </div>

        <div className="footer">
          <p>Powered by SoltChain Launchpad • Fee: {selectedFee}</p>
          <p className="footer-note">⚡ Liquidity lock and LP creation will be auto-enabled after presale finalization.</p>
        </div>
      </div>
    </div>
  );
};

export default CreatePresale;