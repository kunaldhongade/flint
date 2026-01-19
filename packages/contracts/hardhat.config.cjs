require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    coston2: {
      url: "https://coston2-api.flare.network/ext/bc/C/rpc",
      chainId: 114,
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length >= 64 ? [process.env.PRIVATE_KEY] : [],
    },
    // flare: {
    //   url: "https://flare-api.flare.network/ext/bc/C/rpc",
    //   chainId: 14,
    //   accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length >= 64 ? [process.env.PRIVATE_KEY] : [],
    // },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};
