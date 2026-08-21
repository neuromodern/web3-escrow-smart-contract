import hre from "hardhat";

async function main() {
  console.log("Starting deployment of EasyEscrow contract...");

  // Retrieve the contract factory for EasyEscrow
  const EasyEscrow = await hre.ethers.getContractFactory("EasyEscrow");

  // Deploy the contract instance
  const escrow = await EasyEscrow.deploy();

  // Wait until the transaction is mined onto the blockchain
  await escrow.waitForDeployment();

  // Get the deployed contract address
  const contractAddress = await escrow.getAddress();

  console.log(`EasyEscrow successfully deployed to: ${contractAddress}`);
}

// Execute deployment and handle possible errors
main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});