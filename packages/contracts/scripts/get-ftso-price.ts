/**
 * Example script to get FTSOv2 price
 * Run with: npx hardhat run scripts/get-ftso-price.ts --network coston2
 */

import { ethers } from 'hardhat';

async function main() {
  // FTSOv2 Registry Address (Coston2 Testnet)
  // Get actual address from Flare documentation
  const FTSO_REGISTRY = '0x...'; // Replace with actual address

  // FTSOv2 Registry ABI (simplified)
  const FTSO_ABI = [
    'function getCurrentPrice(string memory symbol) external view returns (uint256 price, uint256 timestamp, uint256 decimals)',
  ];

  const [signer] = await ethers.getSigners();
  console.log('Using account:', signer.address);

  const ftsoRegistry = new ethers.Contract(FTSO_REGISTRY, FTSO_ABI, signer);

  // Get prices for different symbols
  const symbols = ['BTC', 'XRP', 'DOGE'];

  for (const symbol of symbols) {
    try {
      const result = await ftsoRegistry.getCurrentPrice(symbol);
      const price = Number(result.price) / Math.pow(10, Number(result.decimals));
      const timestamp = new Date(Number(result.timestamp) * 1000);

      console.log(`${symbol} Price: $${price.toFixed(2)}`);
      console.log(`Timestamp: ${timestamp.toISOString()}`);
      console.log('---');
    } catch (error) {
      console.error(`Error fetching ${symbol} price:`, error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


