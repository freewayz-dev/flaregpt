// src/main.jsx (or src/index.jsx)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { web3Config } from "./config/web3Config.js";
import App from "./App.jsx";
import { initI18n } from "./i18n";

import "react-toastify/dist/ReactToastify.css";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// i18n resources are fetched on demand (see src/i18n/index.js), so we wait
// for the active language to be ready before the first render.
initI18n().then(() => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <WagmiProvider config={web3Config}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ToastContainer
              position="top-center"
              autoClose={3000}
              theme="colored"
            />
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </WagmiProvider>
    </StrictMode>,
  );
});