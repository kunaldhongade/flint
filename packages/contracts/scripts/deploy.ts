import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const treasury = process.env.TREASURY_ADDRESS;
  if (!treasury) {
      throw new Error("TREASURY_ADDRESS env var is missing.");
  }

  // 1. Deploy DecisionVerifier (UUPS)
  // Needs attestationVerifier address. Use deployer for staging.
  const DecisionVerifier = await ethers.getContractFactory("DecisionVerifier");
  const decisionVerifier = await upgrades.deployProxy(DecisionVerifier, [deployer.address], { kind: 'uups' });
  await decisionVerifier.waitForDeployment();
  console.log("DecisionVerifier deployed to:", await decisionVerifier.getAddress());

  // 2. Deploy IdentityRegistry (UUPS)
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await upgrades.deployProxy(IdentityRegistry, [], { kind: 'uups' });
  await identityRegistry.waitForDeployment();
  console.log("IdentityRegistry deployed to:", await identityRegistry.getAddress());

  // 3. Deploy ReputationRegistry (UUPS)
  // initialize(address _identityRegistry)
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await upgrades.deployProxy(ReputationRegistry, [await identityRegistry.getAddress()], { kind: 'uups' });
  await reputationRegistry.waitForDeployment();
  console.log("ReputationRegistry deployed to:", await reputationRegistry.getAddress());

  // 3.5 Deploy MockERC20 (Test Asset)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Flint Test Asset", "fUSD", ethers.parseEther("1000000"));
  await mockToken.waitForDeployment();
  console.log("MockERC20 deployed to:", await mockToken.getAddress());

  // 4. Deploy FeeManager (UUPS)
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const feeManager = await upgrades.deployProxy(FeeManager, [treasury], { kind: 'uups' });
  await feeManager.waitForDeployment();
  console.log("FeeManager deployed to:", await feeManager.getAddress());

  // 3. Deploy DecisionLogger (UUPS)
  // Pass deployed decisionVerifier address
  const DecisionLogger = await ethers.getContractFactory("DecisionLogger");
  const decisionLogger = await upgrades.deployProxy(DecisionLogger, [await decisionVerifier.getAddress()], { kind: 'uups' });
  await decisionLogger.waitForDeployment();
  console.log("DecisionLogger deployed to:", await decisionLogger.getAddress());

  // 4. Deploy PortfolioManager (UUPS)
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = await upgrades.deployProxy(PortfolioManager, [
    await feeManager.getAddress(),
    await decisionLogger.getAddress()
  ], { kind: 'uups' });
  await portfolioManager.waitForDeployment();
  console.log("PortfolioManager deployed to:", await portfolioManager.getAddress());

  console.log("\n=== Deployment Summary ===");
  console.log("DecisionVerifier:", await decisionVerifier.getAddress());
  console.log("IdentityRegistry:", await identityRegistry.getAddress());
  console.log("ReputationRegistry:", await reputationRegistry.getAddress());
  console.log("MockERC20:", await mockToken.getAddress());
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

