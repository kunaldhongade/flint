import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy DecisionVerifier
  // In Staging, the deployer acts as the Attestation Oracle for simplicity, 
  // but this is explicit and separate from the Enclave Key
  const Verifier = await ethers.getContractFactory("DecisionVerifier");
  const attestationVerifierAddress = deployer.address; 
  console.log("Deploying DecisionVerifier with AttestationVerifier:", attestationVerifierAddress);
  
  const verifier = await upgrades.deployProxy(Verifier, [attestationVerifierAddress], { kind: 'uups' });
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("DecisionVerifier deployed to:", verifierAddress);

  // 2. Deploy DecisionLogger
  const Logger = await ethers.getContractFactory("DecisionLogger");
  console.log("Deploying DecisionLogger with Verifier:", verifierAddress);
  
  const logger = await upgrades.deployProxy(Logger, [verifierAddress], { kind: 'uups' });
  await logger.waitForDeployment();
  const loggerAddress = await logger.getAddress();
  console.log("DecisionLogger deployed to:", loggerAddress);

  console.log("----------------------------------------------------");
  console.log("Deployment Complete for Coston2 Staging");
  console.log("Verifier:", verifierAddress);
  console.log("Logger:", loggerAddress);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
