# EasyEscrow Web3 dApp

EasyEscrow is a decentralized, multi-chain escrow service designed to facilitate secure transactions between a Buyer and a Seller, overseen by a neutral Arbiter (Guarantor). Built for the modern Web3 ecosystem, it supports both Native coins and ERC-20 tokens across multiple networks.

Try online:
[https://archetype.cam/dapp/escrow-with-arbiter-smart-contract/](https://archetype.cam/dapp/escrow-with-arbiter-smart-contract/)


---

## Project Structure

```text

├── index.html                       # Main application entry point (UI layout and modals)
├── hardhat.config.js                # Hardhat config with networks
├── vite.config.ts                   # Vite build configuration (custom IIFE output, CSS extraction)
├── src/
│   ├── main.ts                      # Core application logic, Wagmi state, Reown KEY, and contract interactions
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

Here is a short, punchy section you can add directly to your `README.md`. It perfectly highlights that the first step is ridiculously easy, while the rest are for advanced customization.

---

##  Quick Setup & Deployment

Getting started is easy. 
**Step 1 is all you need** to use the dApp immediately with the existing, secure smart contract. Steps 2 and 3 are for advanced users who want full control over the platform fees.

### Step 1: The Easy Way (Use Existing Contract)
To run this dApp anywhere, you only need to connect a wallet provider:

* Get a free Project ID from [Reown](https://reown.com/) (formerly Web3Modal).
* Paste it into `src/main.ts` (`const projectId = 'YOUR_KEY';`).
* **That's it!** The dApp is fully functional and ready to use.

### Step 2: Deploy Your Own Contract (Advanced and need a fee for networks)

If you want to route the 0.5% platform fee to your own wallet (or set it to 0), you must deploy your own instance of the contract:

* Add your deployer wallet's private key to a `.env` file.
* Compile and deploy via Hardhat (`npx hardhat run scripts/deploy.js --network <network_name>`).
* Update the new contract addresses in `src/config.ts`.
* **For a detailed, step-by-step tutorial, read the full article:** [Building a Web3 Escrow Smart Contract on Medium](https://medium.com/@neuromodern/building-web3-escrow-smart-contract-e49e9f48ab2f).

### Step 3: Verify on Etherscan (Optional)

* For transparency, verify your custom contract on block explorers using `npx hardhat verify`.



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
