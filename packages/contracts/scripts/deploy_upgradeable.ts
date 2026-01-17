import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying upgradeable contracts with account:", deployer.address);

  // 1. Deploy IdentityRegistry (Independent)
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await upgrades.deployProxy(IdentityRegistry, [], { kind: 'uups' });
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("IdentityRegistry (Proxy) deployed to:", identityRegistryAddress);

  // 2. Deploy DecisionVerifier (Independent)
  const DecisionVerifier = await ethers.getContractFactory("DecisionVerifier");
  const decisionVerifier = await upgrades.deployProxy(DecisionVerifier, [], { kind: 'uups' });
  await decisionVerifier.waitForDeployment();
  const decisionVerifierAddress = await decisionVerifier.getAddress();
  console.log("DecisionVerifier (Proxy) deployed to:", decisionVerifierAddress);

  // 3. Deploy ReputationRegistry (Depends on IdentityRegistry)
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await upgrades.deployProxy(ReputationRegistry, [identityRegistryAddress], { kind: 'uups' });
  await reputationRegistry.waitForDeployment();
  console.log("ReputationRegistry (Proxy) deployed to:", await reputationRegistry.getAddress());

  // 4. Deploy DecisionLogger (Depends on DecisionVerifier)
  const DecisionLogger = await ethers.getContractFactory("DecisionLogger");
  const decisionLogger = await upgrades.deployProxy(DecisionLogger, [decisionVerifierAddress], { kind: 'uups' });
  await decisionLogger.waitForDeployment();
  const decisionLoggerAddress = await decisionLogger.getAddress();
  console.log("DecisionLogger (Proxy) deployed to:", decisionLoggerAddress);

  // 5. Deploy FeeManager (Needs Treasury)
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const feeManager = await upgrades.deployProxy(FeeManager, [treasury], { kind: 'uups' });
  await feeManager.waitForDeployment();
  const feeManagerAddress = await feeManager.getAddress();
  console.log("FeeManager (Proxy) deployed to:", feeManagerAddress);

  // 6. Deploy PortfolioManager (Depends on FeeManager, DecisionLogger)
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = await upgrades.deployProxy(PortfolioManager, [feeManagerAddress, decisionLoggerAddress], { kind: 'uups' });
  await portfolioManager.waitForDeployment();
  console.log("PortfolioManager (Proxy) deployed to:", await portfolioManager.getAddress());

  console.log("\n=== Upgradeable Deployment Summary ===");
  console.log("IdentityRegistry:", identityRegistryAddress);
  console.log("DecisionVerifier:", decisionVerifierAddress);
  console.log("ReputationRegistry:", await reputationRegistry.getAddress());
  console.log("DecisionLogger:", decisionLoggerAddress);
  console.log("FeeManager:", feeManagerAddress);
  console.log("PortfolioManager:", await portfolioManager.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
