const { ContractFactory } = require('@ethersproject/contracts');
const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
var prizeLinkedAccountVault;


// Start test block
describe('Boundary test for drawing and ticket issuance', function () {
  before(async function () {
    this.PrizeLinkedAccountVault = await ethers.getContractFactory("SandboxPrizeLinkedAccountVaultLuniverse");
    [owner, user1, bank1, bank2] = await ethers.getSigners();
    ownerAddress = owner.address;
  });

  beforeEach(async function () {
    console.log(this.PrizeLinkedAccountVault.bytecode)
  });
it('test',async()=>{
  console.log(prizeLinkedAccountVault.bytecode)
});



});



