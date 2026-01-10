import { ethers } from 'ethers';

/**
 * Format token amount to human-readable string
 */
export function formatTokenAmount(amount: string, decimals: number = 18): string {
  try {
    return ethers.formatUnits(amount, decimals);
  } catch {
    return amount;
  }
}

/**
 * Parse token amount to BigNumber string
 */
export function parseTokenAmount(amount: string, decimals: number = 18): string {
  try {
    return ethers.parseUnits(amount, decimals).toString();
  } catch {
    return amount;
  }
}

/**
 * Calculate APY from yield data
 */
export function calculateAPY(principal: number, yieldAmount: number, days: number): number {
  if (principal === 0 || days === 0) return 0;
  const dailyRate = yieldAmount / principal;
  const annualRate = dailyRate * (365 / days);
  return annualRate * 100;
}

/**
 * Format USD currency
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

