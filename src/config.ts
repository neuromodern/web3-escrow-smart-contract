export type Token = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
};

export type ChainConfig = {
  id: number;
  name: string;
  escrowContractAddress: `0x${string}`;
  tokens: Record<string, Token>;
};


// We use the zero address to represent the native coin (ETH, BNB, MATIC/POL)
// because our Solidity smart contract expects address(0) for native transactions.
const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

export const APP_CONFIG: Record<number, ChainConfig> = {
  //1. Ethereum Mainnet
  1: {
    id: 1,
    name: "Ethereum",
    escrowContractAddress: "0xAC4afa319977b75693aac25d44E2DD17ce32336f",
    tokens: {
      ETH: { symbol: "ETH", name: "Ethereum", address: NATIVE_ADDRESS, decimals: 18 },
      USDT: { symbol: "USDT", name: "Tether USD", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
      USDC: { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
      WBTC: { symbol: "WBTC", name: "Wrapped BTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 }
    }
  },
  
  //2. Ethereum Sepolia (Testnet)
  11155111: {
    id: 11155111,
    name: "Sepolia Testnet",
    escrowContractAddress: "0xAC4afa319977b75693aac25d44E2DD17ce32336f",
    tokens: {
      ETH: { symbol: "ETH", name: "Sepolia ETH", address: NATIVE_ADDRESS, decimals: 18 }
    }
  },
  
  //3. BNB Smart Chain (BSC)
  56: {
    id: 56,
    name: "BNB Smart Chain",
    escrowContractAddress: "0xAC4afa319977b75693aac25d44E2DD17ce32336f",
    tokens: {
      BNB: { symbol: "BNB", name: "BNB", address: NATIVE_ADDRESS, decimals: 18 },
      USDT: { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
      USDC: { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
      BTCB: { symbol: "BTCB", name: "BTCB Token", address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18 }
    }
  },
  
  //4. Polygon Mainnet
  137: {
    id: 137,
    name: "Polygon",
    escrowContractAddress: "0xAC4afa319977b75693aac25d44E2DD17ce32336f",
    tokens: {
      POL: { symbol: "POL", name: "Polygon Ecosystem Token", address: NATIVE_ADDRESS, decimals: 18 },
      USDT: { symbol: "USDT", name: "Tether USD", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
      USDC: { symbol: "USDC", name: "USD Coin", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
      WBTC: { symbol: "WBTC", name: "Wrapped BTC", address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8 }
    }
  },

  //5. Base
  8453: {
    id: 8453,
    name: "Base",
    escrowContractAddress: "0xAC4afa319977b75693aac25d44E2DD17ce32336f",
    tokens: {
      ETH: { symbol: "ETH", name: "Ethereum", address: NATIVE_ADDRESS, decimals: 18 },
      USDC: { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
      cbBTC: { symbol: "cbBTC", name: "Coinbase Wrapped BTC", address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8 }
    }
  },

  //6. Arbitrum One
  42161: {
    id: 42161,
    name: "Arbitrum One",
    escrowContractAddress: "0xAC4afa319977b75693aac25d44E2DD17ce32336f",
    tokens: {
      ETH: { symbol: "ETH", name: "Ethereum", address: NATIVE_ADDRESS, decimals: 18 },
      USDT: { symbol: "USDT", name: "Tether USD", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
      USDC: { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
      WBTC: { symbol: "WBTC", name: "Wrapped BTC", address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", decimals: 8 }
    }
  },

  //7. OP Mainnet (Optimism)
  10: {
    id: 10,
    name: "OP Mainnet",
    escrowContractAddress: "0xAC4afa319977b75693aac25d44E2DD17ce32336f",
    tokens: {
      ETH: { symbol: "ETH", name: "Ethereum", address: NATIVE_ADDRESS, decimals: 18 },
      USDT: { symbol: "USDT", name: "Tether USD", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
      USDC: { symbol: "USDC", name: "USD Coin", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
      WBTC: { symbol: "WBTC", name: "Wrapped BTC", address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", decimals: 8 }
    }
  }
};