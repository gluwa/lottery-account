require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = { 
  networks:{
    hardhat: {
      gas: 32_000_000,
      blockGasLimit: 32_000_000
    }
  },
  mocha:{
    timeout: 500000,
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