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
describe('Ticket Reissuance', function () {
  before(async function () {
    [owner, user1, bank1, bank2, user2, user3, lender] = await ethers.getSigners();
  });

  beforeEach(async function () {
    [prizeLinkedAccountVault, gluwaCoin, gluwaCoin2] = await testHelper.setupContractTesting(owner, user1, user2, mintAmount, depositAmount);
  });
 


  it('verify ticket reissuance for next draw', async function () {
    const processingCap = 7;
    const randomMax = 99999999;
    const randomMin = 10000000;
    var setPrizeLinkedAccountSettingsTxn = await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      processingCap,
      0,
      1,
      testHelper.lowerLimitPercentage
    );
    var receipt = await setPrizeLinkedAccountSettingsTxn.wait();
    expect(receipt.events.length).to.equal(2);
    await expect(setPrizeLinkedAccountSettingsTxn).to.emit(prizeLinkedAccountVault, "AccountSavinSettingsUpdated").withArgs(
      owner.address,
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      receipt.events[0].args['budget'],
      1,
      1
    );
    expect(BigInt(receipt.events[0].args['budget'])).to.equal(testHelper.budget);
    await expect(setPrizeLinkedAccountSettingsTxn).to.emit(prizeLinkedAccountVault, "GluwaPrizeDrawSettingsUpdated").withArgs(
      owner.address,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      processingCap,
      0,
      1,
      receipt.events[1].args['lowerLimitPercentage']
    );
    expect(BigInt(receipt.events[1].args['lowerLimitPercentage'])).to.equal(testHelper.lowerLimitPercentage);
    var drawDate1 = BigInt(0);
    var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
    var totalInDraw1 = 0;
    for (var i = 0; i < 11; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank2.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime1, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
      })[0].args;

      var drawDateTemp = ticketEvent[0];
      if (drawDate1 == BigInt(0)) {
        drawDate1 = drawDateTemp;
      }
      else if (drawDate1 < drawDateTemp) {
        break;
      }
      totalInDraw1++;
    }
   
    await prizeLinkedAccountVault.makeDrawV1(drawDate1, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    var { 0: owners1, 1: tickets1, 2: winningTicket1, 3: balanceEachDraw1 } = await prizeLinkedAccountVault.getDrawDetails(drawDate1);

    var winner1 = await prizeLinkedAccountVault.getDrawWinner(drawDate1);

    var winnerTxn1 = await prizeLinkedAccountVault.awardWinnerV1(drawDate1);
    var receiptWinner1 = await winnerTxn1.wait();
    var winnerEvent1 = receiptWinner1.events.filter(function (one) {
      return one.event == "WinnerSelected";
    })[0].args;
    var earnt1 = BigInt(balanceEachDraw1) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);
    expect(winner1).to.equal(winnerEvent1[0]);
    expect(earnt1).to.equal(winnerEvent1[1]);
    
    var totalPool1 = depositAmount * BigInt(totalInDraw1) + earnt1;

    var drawDate2 = BigInt(0);
    var totalInDraw2 = 0;
    var depositTime2 = (Date.now() / 1000) | 0;
    for (var i = 0; i < 15; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank2.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime2, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
      })[0].args;

      var drawDateTemp = ticketEvent[0];
      if (drawDate2 == BigInt(0)) {
        drawDate2 = drawDateTemp;
      }
      else if (drawDate2 < drawDateTemp) {
        break;
      }
      totalInDraw2++;
    }

    //The total pending will exlude the winner
    expect((await prizeLinkedAccountVault.getEligibleAddressPendingAddedToDraw(drawDate2)).length).to.equal(totalInDraw1 - 1);
    await prizeLinkedAccountVault.regenerateTicketForNextDraw(drawDate2);
    expect((await prizeLinkedAccountVault.getEligibleAddressPendingAddedToDraw(drawDate2)).length).to.equal(totalInDraw1 - processingCap - 1);
    await prizeLinkedAccountVault.regenerateTicketForNextDraw(drawDate2);
    expect((await prizeLinkedAccountVault.getEligibleAddressPendingAddedToDraw(drawDate2)).length).to.equal(0);


    await prizeLinkedAccountVault.makeDrawV1(drawDate2, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));

    var { 0: owners, 1: tickets, 2: winningTicket2, 3: balanceEachDraw2 } = await prizeLinkedAccountVault.getDrawDetails(drawDate2);


    var winner2 = await prizeLinkedAccountVault.getDrawWinner(drawDate2);

    const { 0: savingAccount_idx,
      1: savingAccount_hash,
      2: savingAccount_owner,
      3: savingAccount_creationDate,
      4: savingAccount_balance,
      5: savingAccount_earning,
      6: savingAccount_state,
      7: savingAccount_securityReferenceHash } = (await prizeLinkedAccountVault.getSavingAcountFor(winner2));

    var winnerTxn2 = await prizeLinkedAccountVault.awardWinnerV1(drawDate2);
    var receiptWinner2 = await winnerTxn2.wait();
    var winnerEvent2 = receiptWinner2.events.filter(function (one) {
      return one.event == "WinnerSelected";
    })[0].args;
    var earnt2 = BigInt(balanceEachDraw2) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);

    
    expect(balanceEachDraw2).to.equal(totalPool1 + depositAmount * BigInt(totalInDraw2));

    expect(winner2).to.equal(winnerEvent2[0]);
    expect(earnt2).to.equal(winnerEvent2[1]);

    const { 0: savingAccount_idx1,
      1: savingAccount_hash1,
      2: savingAccount_owner1,
      3: savingAccount_creationDate1,
      4: savingAccount_balance1,
      5: savingAccount_earning1,
      6: savingAccount_state1,
      7: savingAccount_securityReferenceHash1 } = (await prizeLinkedAccountVault.getSavingAcountFor(winner2));

    var totalAfterWinning = BigInt(savingAccount_balance) + earnt2;
    expect(totalAfterWinning).to.equal(savingAccount_balance1);
  });  
});