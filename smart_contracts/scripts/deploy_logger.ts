import { ethers } from "hardhat";

async function main() {
  console.log("Deploying DecisionLogger to Coston2...");

  const DecisionLogger = await ethers.getContractFactory("DecisionLogger");
  const logger = await DecisionLogger.deploy();

  await logger.waitForDeployment();

  const address = await logger.getAddress();
  console.log(`DecisionLogger deployed to: ${address}`);
  
  // Wait for block confirmations before verification (optional but recommended)
  console.log("Waiting for confirmations...");
  // Sleep for 10 seconds generic wait
  await new Promise(r => setTimeout(r, 10000));
  
  console.log("Deployment complete. Verify on explorer.");
  console.log(`npx hardhat verify --network coston2 ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
