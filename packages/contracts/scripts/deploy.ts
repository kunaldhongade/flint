import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy FeeManager
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const treasury = deployer.address; // TODO: Replace with actual treasury address
  const feeManager = await FeeManager.deploy(treasury);
  await feeManager.waitForDeployment();
  console.log("FeeManager deployed to:", await feeManager.getAddress());

  // Deploy DecisionLogger
  const DecisionLogger = await ethers.getContractFactory("DecisionLogger");
  const decisionLogger = await DecisionLogger.deploy();
  await decisionLogger.waitForDeployment();
  console.log("DecisionLogger deployed to:", await decisionLogger.getAddress());

  // Deploy PortfolioManager
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = await PortfolioManager.deploy(
    await feeManager.getAddress(),
    await decisionLogger.getAddress()
  );
  await portfolioManager.waitForDeployment();
  console.log("PortfolioManager deployed to:", await portfolioManager.getAddress());

  console.log("\n=== Deployment Summary ===");
  console.log("FeeManager:", await feeManager.getAddress());
  console.log("DecisionLogger:", await decisionLogger.getAddress());
  console.log("PortfolioManager:", await portfolioManager.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

