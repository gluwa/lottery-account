const { ContractFactory } = require('@ethersproject/contracts');
const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./shared');
var chai = require('chai');
chai.use(require('chai-bignumber')());
use(solidity);

const name = 'Gluwacoin';
const symbol = 'Gluwacoin';
const decimals = 18;
const lowerLimitPercentage = 30; 
const standardInterestRate = 15;
const standardInterestRatePercentageBase = 100;
const cutOffHour = 16;
const cutOffMinute = 59;
const ticketRangeFactor = 100;
const decimalsVal = BigInt(10) ** BigInt(decimals);
const budget = BigInt(20000000000) * decimalsVal;

var ownerAddress;
var owner;
var user1;
var bank1;
var bank2;
var gluwaCoinAddress;
var large_mintAmount = BigInt(2000000000) * decimalsVal;
var large_depositBaseAmount = BigInt(700000);
var depositAmount = large_depositBaseAmount * decimalsVal;
var large_depositAmount = large_depositBaseAmount * decimalsVal * BigInt(10);
var targetAccountCreated = 3;
//var targetAccountCreated = 3000; //Tested
var ticketPerToken = 1;
var prizeLinkedAccountVault;
var processingCap = 272;
var gluwaCoin;
var gluwaCoin2;

var mintAmount = BigInt(2000000) * testHelper.decimalsVal;
var depositAmount = BigInt(30000) * testHelper.decimalsVal;

// Start test block
describe('Boundary test for drawing and ticket issuance', function () {
  before(async function () {
    [owner, user1, bank1, bank2, user2, user3, lender] = await ethers.getSigners();
  });

  beforeEach(async function () {
    [prizeLinkedAccountVault, gluwaCoin, gluwaCoin2] = await testHelper.setupContractTesting(owner, user1, user2, large_mintAmount, large_depositAmount);
  });

  it('create prize-linked account with many tickets', async function () {
    var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, large_depositAmount, user1.address);
    var receipt = await accountTxn.wait();
    var ticketEvent = receipt.events.filter(function (one) {
      return one.event == "TicketCreated";
    })[0].args;

    var drawDate = ticketEvent[0];
    var ticketId = ticketEvent[1];
    var owner = ticketEvent[2];
    var lower = ticketEvent[3];
    var upper = ticketEvent[4];

    const { 0: ticket_idx,
      1: ticket_owner,
      2: ticket_lower,
      3: ticket_upper } = (await prizeLinkedAccountVault.getTicketRangeById(ticketId));

    expect(upper.toBigInt()).to.equal(ticket_upper);
    expect(lower.toBigInt()).to.equal(ticket_lower);
    expect(owner).to.equal(ticket_owner);
    expect(owner).to.equal(user1.address);

    expect(testHelper.getTimeFromTimestamp(drawDate.toNumber())).to.equal("17:00:00");   
    var range = upper.toBigInt() - lower.toBigInt() + BigInt(1);
    expect(range).to.equal((large_depositAmount / decimalsVal));

  });



  it('create multiple prize-linked accounts with many tickets', async function () {
    var balance = await gluwaCoin.balanceOf(prizeLinkedAccountVault.address);
    for (var i = 0; i < targetAccountCreated; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, large_mintAmount);
      await bank1.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, temp.address, depositAmount, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
      })[0].args;

      var drawDate = ticketEvent[0];
      var owner = ticketEvent[2];
      var lower = ticketEvent[3];
      var upper = ticketEvent[4];

      var range = upper.toBigInt() - lower.toBigInt()+ BigInt(1);
      expect(range).to.equal((depositAmount / decimalsVal));
      expect(owner).to.equal(temp.address);
      expect(testHelper.getTimeFromTimestamp(drawDate.toNumber())).to.equal("17:00:00");
    }

    expect((await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)).toString()).to.equal((BigInt(balance) + BigInt(targetAccountCreated) * depositAmount).toString());
  });

  it('do drawing with large number of participant', async function () {
    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < targetAccountCreated; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, large_mintAmount);
      await bank1.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, temp.address, depositAmount, temp.address);
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
    const randomMax = 99999999;
    const randomMin = 10000000;

    await prizeLinkedAccountVault.makeDrawV1(drawDate,Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    expect(totalInDraw).to.equal(owners.length);
    expect(totalInDraw).to.equal(tickets.length);

  });

  it('do drawing and award winner with large number of participant', async function () {
    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < targetAccountCreated; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, large_mintAmount);
      await bank2.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, temp.address, depositAmount, temp.address);
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
    const randomMax = 99999999;
    const randomMin = 10000000;    
    await prizeLinkedAccountVault.makeDrawV1(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));   
    var winnerTxn = await prizeLinkedAccountVault.awardWinnerV1(drawDate);
    var receiptWinner = await winnerTxn.wait();
    var winnerEvent = receiptWinner.events.filter(function (one) {
      return one.event == "WinnerSelected";
    })[0].args;
    expect(await prizeLinkedAccountVault.getDrawWinner(drawDate)).to.equal(winnerEvent[0]);
  });


});



