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
      prizeLinkedAccountVault.invest(testHelper.ADDRESS_0, investAmount)   
      ).to.be.revertedWith("GluwaPrizeLinkedAccount: Failed to validate the invest withdrawal.");

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
      ).to.be.revertedWith("GluwaPrizeLinkedAccount: Failed to validate the invest withdrawal.");
  });

  it('can invest to withdraw completely when there is no saving account', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount);
    await gluwaCoin.connect(user2).approve(prizeLinkedAccountVault.address, depositAmount + BigInt(3));
    var addBoostingFundTxn = await prizeLinkedAccountVault.addBoostingFund(user2.address, depositAmount + BigInt(1));
    var receipt = await addBoostingFundTxn.wait();
    expect(receipt.events.length).to.equal(4);
    await expect(addBoostingFundTxn).to.emit(prizeLinkedAccountVault, "TopUpBalance").withArgs(user2.address, depositAmount + BigInt(1));

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

  it('Invest will not affect the prize pool', async function () {
    var setPrizeLinkedAccountSettingsTxn = await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      0,
      1,
      BigInt(3));
    await setPrizeLinkedAccountSettingsTxn.wait();

    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < 30; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank2.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,bytes)"](temp.address, depositAmount, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
      })[0].args;

      var drawDateTemp = ticketEvent[0];


      if (drawDate == BigInt(0)) {
        drawDate = drawDateTemp;
      }
      else if (drawDate < drawDateTemp) {
        break;
      }
      totalInDraw++;
    }

    // Add Boosting fund and do invest before the draw, it should not affect the balance of the draw
    await gluwaCoin.mint(user3.address, mintAmount);
    await gluwaCoin.connect(user3).approve(prizeLinkedAccountVault.address, depositAmount * BigInt(2));
    var boostingFund = depositAmount * BigInt(2);
    await prizeLinkedAccountVault.addBoostingFund(user3.address, boostingFund);
    var originalContractBalance = (await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)).toBigInt();
    var balanceAfterReceiveBoostingFund = depositAmount * BigInt(totalInDraw + 2);
   
    expect(originalContractBalance).to.be.equals(balanceAfterReceiveBoostingFund);
    await prizeLinkedAccountVault.invest(lender.address, originalContractBalance * BigInt(97) / BigInt(100));
    expect(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)).to.be.equals(originalContractBalance * BigInt(3) / BigInt(100));

    const randomMax = 99999999;
    const randomMin = 10000000;
    var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_NoValidation(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    var receipt2 = await makeDrawV1Txn.wait();


    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);

    await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate, receipt2.events[0].args['winningTicket'], min, max);

    var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
    var balance = await gluwaCoin.balanceOf(winner);

    const { 0: savingAccount_idx,
      1: savingAccount_hash,
      2: savingAccount_owner,
      3: savingAccount_creationDate,
      4: savingAccount_balance,
      5: savingAccount_earning,
      6: savingAccount_state,
      7: savingAccount_securityReferenceHash } = (await prizeLinkedAccountVault.getSavingAcountFor(winner));

    var winnerTxn = await prizeLinkedAccountVault.awardWinnerV1(drawDate);
    var receiptWinner = await winnerTxn.wait();
    var winnerEvent = receiptWinner.events.filter(function (one) {
      return one.event == "WinnerSelected";
    })[0].args;
    var earnt = (BigInt(balanceEachDraw) + boostingFund) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);

    // Balance each draw mus tbe equal to the total deposit
    expect(balanceEachDraw).to.be.equal(depositAmount * BigInt(totalInDraw));
    const { 0: savingAccount_idx1,
      1: savingAccount_hash1,
      2: savingAccount_owner1,
      3: savingAccount_creationDate1,
      4: savingAccount_balance1,
      5: savingAccount_earning1,
      6: savingAccount_state1,
      7: savingAccount_securityReferenceHash1 } = (await prizeLinkedAccountVault.getSavingAcountFor(winner));


    expect(winner).to.equal(winnerEvent[0]);
    expect(earnt).to.equal(winnerEvent[1]);
    expect(savingAccount_earning1).to.equal(winnerEvent[1]);
    var totalAfterWinning = BigInt(savingAccount_balance) + earnt;
    expect(totalAfterWinning).to.equal(savingAccount_balance1);
    expect(balance).to.equal(await gluwaCoin.balanceOf(winner));
    // Winner only get the token after he/she withdraws
    expect(balance).to.equal(mintAmount - depositAmount);

  });

});