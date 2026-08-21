// YOU CAN SET UP FEE IN hardhat.config.js example:
//        maxFeePerGas: 100000000,         // 0.10 Gwei
//        maxPriorityFeePerGas: 10000000   // 0.01 Gwei (min tip)
const hre = require("hardhat");

async function main() {
  console.log("----------------------------------------------------");
  console.log("       SPEED-UP DEPLOYMENT (NONCE = 0)              ");
  console.log("----------------------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log(`[+] Deployer Address: ${deployer.address}`);
  console.log(`[+] Network:          ${hre.network.name} (Chain ID: ${network.chainId})`);

  // 1. Fetch current network fee data
  const feeData = await hre.ethers.provider.getFeeData();

  // 2. EVM replacement rules require at least +10% boost; we apply +25% for safety
  const maxFeePerGas = feeData.maxFeePerGas
    ? (feeData.maxFeePerGas * 125n) / 100n
    : undefined;

  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
    ? (feeData.maxPriorityFeePerGas * 125n) / 100n
    : undefined;

  console.log(`[+] Boosted MaxFee:   ${hre.ethers.formatUnits(maxFeePerGas, "gwei")} Gwei`);
  console.log(`[+] Boosted Priority: ${hre.ethers.formatUnits(maxPriorityFeePerGas, "gwei")} Gwei`);
  console.log(`[+] Target Nonce:     0 (Preserving deterministic contract address)`);

  console.log("\n[~] Submitting replacement transaction to mempool...");

  // 3. Deploy contract with forced nonce: 0 and boosted gas parameters
  const EasyEscrow = await hre.ethers.getContractFactory("EasyEscrow");
  const escrow = await EasyEscrow.deploy({
    nonce: 0,
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas
  });

  const txHash = escrow.deploymentTransaction().hash;
  console.log(`[+] Replacement Tx Hash: ${txHash}`);
  console.log("[~] Waiting for block inclusion and receipt...");

  // 4. Wait for confirmation
  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();
  console.log("\n====================================================");
  console.log(`[SUCCESS] Contract deployed at: ${contractAddress}`);
  console.log("====================================================");
}

main().catch((error) => {
  console.error("\n[ERROR] Speed-up deployment failed:", error);
  process.exitCode = 1;
});