import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Components & Utilities
import Footer from "./components/Footer";
import { EMPIRE_CONFIG } from "./utils/EmpireBridge";
// Pages
import Home from "./pages/Home";
import CreateToken from "./pages/CreateToken";
import StandardToken from "./pages/StandardToken";
import FeeToken from "./pages/FeeToken";
import BurnToken from "./pages/BurnToken";
import CreateLock from "./pages/CreateLock";
import Airdrop from "./pages/Airdrop";
import CreatePresale from "./pages/CreatePresale";
import MarketingService from "./pages/MarketingService";
import TermsOfUse from "./pages/TermsOfUse";
import PrivatePolicy from "./pages/PrivatePolicy";
import Documentation from "./pages/Documentation";

// CSS
import "./pages/CreatePresale.css";

function App() {
  // ✅ Backend API Test Function
  const createUser = async () => {
    try {
      const response = await fetch("https://ecobackend-two.vercel.app/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: "0x123", username: "Ashu" }),
      });
      const data = await response.json();
      console.log("Backend Response:", data);
      alert("User Created Successfully ✅");
    } catch (error) {
      console.error("Backend Error:", error);
      alert("Backend Connection Failed ❌");
    }
  };

  return (
    <div style={appStyle}>
      <Router>


    
        <div className="app-container" style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateToken />} />
            <Route path="/standard-token" element={<StandardToken />} />
            <Route path="/fee-token" element={<FeeToken />} />
            <Route path="/burn-token" element={<BurnToken />} />
            <Route path="/create-lock" element={<CreateLock />} />
            <Route path="/airdrop" element={<Airdrop />} />
            <Route path="/create-presale" element={<CreatePresale />} />
            <Route path="/marketing" element={<MarketingService />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/private-policy" element={<PrivatePolicy />} />
            <Route path="/terms-of-use" element={<TermsOfUse />} />
          </Routes>
        </div>
        <Footer />
      </Router>
    </div>
  );
}

// Styles separated for better readability
const appStyle = {
  backgroundColor: "#0a1120",
  minHeight: "100vh",
  width: "100%",
  margin: 0,
  padding: 0,
  color: "white",
  display: "flex",
  flexDirection: "column",
  fontFamily: "'Inter', sans-serif",
};

const testButtonStyle = {
  position: "fixed",
  top: "20px",
  right: "20px",
  zIndex: 9999,
  padding: "12px 18px",
  background: "#06b6d4",
  color: "#000",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
};

export default App;