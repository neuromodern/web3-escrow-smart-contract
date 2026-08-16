# EasyEscrow Web3 dApp

EasyEscrow is a decentralized, multi-chain escrow service designed to facilitate secure transactions between a Buyer and a Seller, overseen by a neutral Arbiter (Guarantor). Built for the modern Web3 ecosystem, it supports both Native coins and ERC-20 tokens across multiple networks.


---

## Project Structure

```text

├── index.html                       # Main application entry point (UI layout and modals)
├── hardhat.config.js                # Hardhat config with networks
├── vite.config.ts                   # Vite build configuration (custom IIFE output, CSS extraction)
├── src/
│   ├── main.ts                      # Core application logic, Wagmi state, and contract interactions
│   ├── main.css                     # Custom styling
│   └── config.ts                    # Network configurations, contract addresses, and token metadata
├── artifacts/                       # Compiled smart contracts, need for deploy to blockchain
├── scripts/          
│   ├── deploy.js                    # Deploy smart contract to blockchain
│   ├── estimate.js                  # Ask gas estimate and price from blockchain
│   └── deploy-nonce-0-speed-up.js   # Speed up deploy with extra fee if it stuck
└── contracts/
    └── EasyEscrow.sol               # The core Solidity smart contract managing the escrow logic
    
    
```
## Features

* **Multi-Chain Support:** Fully compatible with Ethereum Mainnet, Sepolia, BSC, Polygon, Base, Arbitrum, and Optimism. 
* **Native & ERC-20 Assets:** Securely lock both native blockchain coins (e.g., ETH, BNB) and standard ERC-20 tokens (e.g., USDC, USDT) in the smart contract. 
* **Smart Roles:** 
* **Seller:** Delivers the agreed-upon asset or service.
* **Buyer:** Deposits the funds and can request a refund if deadlines are missed.
* **Arbiter:** A trusted third party who resolves disputes and distributes funds for a set fee.

---

## Tech Stack

* **Frontend:** HTML5, CSS3, TypeScript
* **Web3 Integration:** [Viem](https://viem.sh/), [Wagmi](https://wagmi.sh/), and [AppKit (WalletConnect)](https://walletconnect.com/)
* **Build Tool:** [Vite](https://vitejs.dev/) (Configured for IIFE non-module output)
* **Smart Contracts:** Solidity (OpenZeppelin Contracts)    
