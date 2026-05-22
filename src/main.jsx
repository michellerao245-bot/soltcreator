import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig, http } from "wagmi"
import { bsc } from "wagmi/chains"
// 🔥 ECOHUB se jo Web3Provider copy kiya tha, use yahan import kar liya
import { Web3Provider } from "./context/Web3Provider.jsx"

const config = createConfig({
  chains: [bsc],
  transports: { [bsc.id]: http() },
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* 🔥 Web3Provider ko App ke theek upar wrap kar diya taaki saare wallet components active ho sakein */}
        <Web3Provider>
          <App />
        </Web3Provider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)