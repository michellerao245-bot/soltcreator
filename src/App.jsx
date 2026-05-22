import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Empire Bridge Import
import { EMPIRE_CONFIG } from "./utils/EmpireBridge";

// Pages Imports
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

// CSS Import
import "./pages/CreatePresale.css";

// Components
import Footer from "./components/Footer";

function App() {
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

  return (
    <div style={appStyle}>
      <Router>
        <div className="app-container" style={{ flex: 1 }}>
          <Routes>

            {/* Home */}
            <Route path="/" element={<Home />} />

            {/* Token Pages */}
            <Route path="/create" element={<CreateToken />} />
            <Route path="/standard-token" element={<StandardToken />} />
            <Route path="/fee-token" element={<FeeToken />} />
            <Route path="/burn-token" element={<BurnToken />} />

            {/* Lock & Airdrop */}
            <Route path="/create-lock" element={<CreateLock />} />
            <Route path="/airdrop" element={<Airdrop />} />

            {/* Presale */}
            <Route path="/create-presale" element={<CreatePresale />} />

            {/* Extra Pages */}
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

export default App;