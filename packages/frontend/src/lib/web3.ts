/**
 * Web3 Integration for FLINT Frontend
 * Handles wallet connection and contract interactions
 */

import { ethers } from 'ethers';

// Flare Network Configuration
export const FLARE_NETWORKS = {
  coston2: {
    chainId: '0x72', // 114
    chainName: 'Flare Coston2',
    nativeCurrency: {
      name: 'C2FLR',
      symbol: 'C2FLR',
      decimals: 18,
    },
    rpcUrls: ['https://coston2-api.flare.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://coston2-explorer.flare.network'],
  },
  flare: {
    chainId: '0xE', // 14
    chainName: 'Flare',
    nativeCurrency: {
      name: 'FLR',
      symbol: 'FLR',
      decimals: 18,
    },
    rpcUrls: ['https://flare-api.flare.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://flare-explorer.flare.network'],
  },
};

/**
 * Connect to MetaMask
 */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    network,
  };
}

/**
 * Switch to Flare Network
 */
export async function switchToFlareNetwork(network: 'coston2' | 'flare' = 'coston2') {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: FLARE_NETWORKS[network].chainId }],
    });
  } catch (switchError: any) {
    // If network doesn't exist, add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [FLARE_NETWORKS[network]],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Get user's balance for a token
 */
export async function getTokenBalance(
  provider: ethers.Provider,
  tokenAddress: string,
  userAddress: string
): Promise<string> {
  const tokenContract = new ethers.Contract(
    tokenAddress,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );

  const balance = await tokenContract.balanceOf(userAddress);
  return balance.toString();
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}


