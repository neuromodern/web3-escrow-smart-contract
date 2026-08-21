import hre from "hardhat";

async function main() {
  console.log("Starting gas estimation for EasyEscrow deployment...");

  // 1. Retrieve the contract factory
  const EasyEscrow = await hre.ethers.getContractFactory("EasyEscrow");

  // 2. Generate the raw deployment transaction (without broadcasting it)
  const deployTx = await EasyEscrow.getDeployTransaction();

  // 3. Estimate the gas limit required by the network
  const estimatedGas = await hre.ethers.provider.estimateGas(deployTx);
  console.log(`\n[+] Estimated Gas Limit: ${estimatedGas.toString()} units`);

  // 4. Fetch the current gas price from the network
  const feeData = await hre.ethers.provider.getFeeData();
  
  // Use maxFeePerGas for EIP-1559 networks, or fallback to standard gasPrice
  const gasPrice = feeData.maxFeePerGas || feeData.gasPrice;

  if (gasPrice) {
    // 5. Calculate the total estimated cost (Gas Limit * Gas Price)
    const estimatedCostWei = estimatedGas * gasPrice;
    const estimatedCostEth = hre.ethers.formatEther(estimatedCostWei);
    
    console.log(`[+] Current Gas Price for ${hre.network.name}:   ${hre.ethers.formatUnits(gasPrice, "gwei")} gwei`);
    console.log(`[+] Total Deploy Cost for ${hre.network.name}:   ~${estimatedCostEth} (ETH or Native Token)`);
  } else {
    console.log("[-] Could not fetch current gas price from the network.");
  }
}

// Execute the estimation and handle possible errors
main().catch((error) => {
  console.error("Estimation failed:", error);
  process.exitCode = 1;
});