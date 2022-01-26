require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');



/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = { 
  networks:{
    hardhat: {
      gas: 32_000_000,
      blockGasLimit: 32_000_000,
      gasPrice: 2000,
      initialBaseFeePerGas: 1
    }    
  },
  mocha:{
    timeout: 900000000,
  },
  solidity: {
    version: "0.5.0",
    settings: {
      optimizer: {
        enabled: true
      },
      evmVersion: "byzantium"
    }
  }
};
