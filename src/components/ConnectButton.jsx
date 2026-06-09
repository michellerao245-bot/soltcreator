import React, { useEffect } from 'react' 
// 1. Import badal diya hai (AppKit ke liye)
import { useAppKit } from '@reown/appkit/react'  
import { useAccount } from 'wagmi'  
  
const ConnectButton = () => {  
  // 2. hook ka naam bhi badalna padega
  const { open } = useAppKit()  
  const { address, isConnected } = useAccount()  
  
  const saveUserToBackend = async (walletAddress) => { 
    try { 
      await fetch('https://ecobackend-two.vercel.app/api/users/create', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ walletAddress: walletAddress }) 
      }); 
      console.log("User saved!"); 
    } catch (error) { 
      console.error("Backend failed:", error); 
    } 
  } 
 
  useEffect(() => { 
    if (isConnected && address) { 
      saveUserToBackend(address); 
    } 
  }, [isConnected, address]); 
 
  const shortAddress = address  
    ? `${address.slice(0, 6)}...${address.slice(-4)}`  
    : 'Connect Wallet'  
  
  return (  
    <button  
      type="button"  
      onClick={() => open()} // open() function yahan kaam karega
      style={{  
        backgroundColor: '#fbbf24',  
        color: '#000',  
        padding: '10px 24px',  
        borderRadius: '10px',  
        fontWeight: 'bold',  
        border: 'none',  
        cursor: 'pointer'  
      }}  
    >  
      {isConnected ? shortAddress : 'Connect Wallet'}  
    </button>  
  )  
}  
  
export default ConnectButton