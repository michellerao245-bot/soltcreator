// ========================================== 
// SOLTCHAIN ECOSYSTEM CENTRAL BRIDGE 
// ========================================== 

// 🚀 SMART LOCAL DETECTION: Localhost aur Network IP (192.168...) dono ko check karega
const isLocal = 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1" || 
  window.location.hostname.startsWith("192.168."); 

// Dynamic IP extraction taaki phone pe testing ke waqt sahi IP automatic pick ho jaye
const currentIP = window.location.hostname;

export const EMPIRE_CONFIG = { 
    // 1. Database & Backend Connections 
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL, 
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY, 
    backendApi: "https://solt-backend.render.com", 
 
    // 2. Blockchain Settings (BSC Mainnet) 
    networks: { 
        chainId: 56, 
        chainName: "BNB Smart Chain", 
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, 
        rpcUrls: ["https://bsc-dataseed.binance.org/"], 
        blockExplorerUrls: ["https://bscscan.com"], 
    }, 
 
    // 3. Token & Contract Addresses 
    contracts: { 
        soltToken: "0x6C8942407c65D0f038b04DD5DA3420eC826Cc8d9", 
        feeEngine: "0xC30050aBe984c3B3929822E3BbF33fbBE6b3C423", 
    }, 
 
    // 4. Ecosystem Navigation (Redirect Logic) 
    urls: { 
        // Agar phone/local system par hai toh dynamic IP ke sath port 5173 uthaega, production me Vercel/Netlify Live Domain
        empire: isLocal ? `http://${currentIP}:5173` : "https://soltchain.vercel.app", 
        dice: isLocal ? `http://${currentIP}:5174` : "https://soltchain.vercel.app", 
    } 
}; 
 
/** * BscScan ke links banane ke liye helper function 
 */ 
export const getBscScanLink = (data, type = "address") => { 
    const base = EMPIRE_CONFIG.networks.blockExplorerUrls[0]; 
    if (type === "tx") return `${base}/tx/${data}`; 
    return `${base}/address/${data}#tokentxns`; 
}; 
 
/** * LocalStorage se user session handle karne ke liye (Optional) 
 */ 
export const empireSession = { 
    set: (key, value) => localStorage.setItem(`solt_${key}`, JSON.stringify(value)), 
    get: (key) => JSON.parse(localStorage.getItem(`solt_${key}`)), 
    clear: () => localStorage.clear(), 
};