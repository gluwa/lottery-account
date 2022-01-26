const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./shared');
var chai = require('chai');
chai.use(require('chai-bignumber')());
use(solidity);

var owner;
var user1;
var user2;
var user3;
var bank1;
var bank2;
var mintAmount = BigInt(2000000) * testHelper.decimalsVal;
var depositAmount = BigInt(30000) * testHelper.decimalsVal;
var prizeLinkedAccountVault;
var gluwaCoin;
var gluwaCoin2;


// Start test block
describe('Invest from Vault', function () {
  before(async function () {
    [owner, user1, bank1, bank2, user2, user3, lender] = await ethers.getSigners();
  });

  beforeEach(async function () {
    [prizeLinkedAccountVault, gluwaCoin, gluwaCoin2] = await testHelper.setupContractTesting(owner, user1, user2, mintAmount, depositAmount);
  });

  it('can Operator invest?', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    expect(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)).to.equal(depositAmount);
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(0);
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    var txn = await prizeLinkedAccountVault.invest(lender.address, investAmount);
    var receipt = await txn.wait();

    var event = receipt.events.filter(function (one) {
      return one.event == "Invested";
    })[0].args;
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
    expect(event[0]).to.equal(lender.address);
    expect(event[1]).to.equal(investAmount);

  });


  it('can Operator invest to himself/herself?', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    expect(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)).to.equal(depositAmount);
    var originalAmount = await gluwaCoin.balanceOf(owner.address);
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    var txn = await prizeLinkedAccountVault.invest(owner.address, investAmount);
    var receipt = await txn.wait();

    var event = receipt.events.filter(function (one) {
      return one.event == "Invested";
    })[0].args;
    expect(await gluwaCoin.balanceOf(owner.address)).to.equal(investAmount + BigInt(originalAmount));
    expect(event[0]).to.equal(owner.address);
    expect(event[1]).to.equal(investAmount);

  });

  it('can new-Operator invest?', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    await prizeLinkedAccountVault.addOperator(user2.address);
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    var txn = await prizeLinkedAccountVault.connect(user2).invest(lender.address, investAmount);
    var receipt = await txn.wait();

    var event = receipt.events.filter(function (one) {
      return one.event == "Invested";
    })[0].args;
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
    expect(event[0]).to.equal(lender.address);
    expect(event[1]).to.equal(investAmount);
  });

  it('can non-Operator invest?', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    expect(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)).to.equal(depositAmount);
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    await expect(
      prizeLinkedAccountVault.connect(user1).invest(owner.address, investAmount)
    ).to.be.revertedWith("Restricted to Operators.");
  });

  it('can non-Operator invest to itself?', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    expect(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)).to.equal(depositAmount);
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    await expect(
      prizeLinkedAccountVault.connect(user1).invest(user1.address, investAmount)
    ).to.be.revertedWith("Restricted to Operators.");


  });

  it('can Admin invest?', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    await prizeLinkedAccountVault.addAdmin(user3.address);
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    var txn = await prizeLinkedAccountVault.connect(user3).invest(lender.address, investAmount);
    var receipt = await txn.wait();

    var event = receipt.events.filter(function (one) {
      return one.event == "Invested";
    })[0].args;
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
    expect(event[0]).to.equal(lender.address);
    expect(event[1]).to.equal(investAmount);

  });
  
  it('can invest in a zeroAddress?', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);   
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    await expect(
      prizeLinkedAccountVault.invest("0x0000000000000000000000000000000000000000", investAmount)   
      ).to.be.revertedWith("GluwaPrizeLinkedAccount: Recipient address for investment must be defined.");

  });
  
  it('can invest upto the limit imposed by lowerLimitPercentage?', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    expect(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)).to.equal(depositAmount);
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(0);
    var investAmount = depositAmount - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    var txn = await prizeLinkedAccountVault.invest(lender.address, investAmount);
    var receipt = await txn.wait();

    var event = receipt.events.filter(function (one) {
      return one.event == "Invested";
    })[0].args;
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
    expect(event[0]).to.equal(lender.address);
    expect(event[1]).to.equal(investAmount);

  });

  it('can invest more than the limit imposed by lowerLimitPercentage?', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    expect(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)).to.equal(depositAmount);
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(0);
    var investAmount = depositAmount + BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    await expect(
      prizeLinkedAccountVault.invest(lender.address, investAmount)
      ).to.be.revertedWith("GluwaPrizeLinkedAccount: the investment amount will make the total balance lower than the bottom threshold.");
  });

  it('can invest to withdraw completely when there is no saving account', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount);
    await gluwaCoin.connect(user2).approve(prizeLinkedAccountVault.address, depositAmount + BigInt(3));
    await prizeLinkedAccountVault.addBoostingFund(user2.address, depositAmount + BigInt(1));
    var investAmount = BigInt(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address));
    var txn = await prizeLinkedAccountVault.invest(lender.address, investAmount);
    var receipt = await txn.wait();

    var event = receipt.events.filter(function (one) {
      return one.event == "Invested";
    })[0].args;
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
    expect(event[0]).to.equal(lender.address);
    expect(event[1]).to.equal(investAmount);
    expect(investAmount).to.equal(depositAmount + BigInt(1));
  });
});