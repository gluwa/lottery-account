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


// Start test block
describe('Boundary test for drawing and ticket issuance', function () {
  before(async function () {
    this.GluwaAccountModel = await ethers.getContractFactory("GluwaAccountModel");
    this.DateTimeModel = await ethers.getContractFactory("DateTimeModel");
    var GluwaAccountModel = await this.GluwaAccountModel.deploy();
    var DateTimeModel = await this.DateTimeModel.deploy();
    await DateTimeModel.deployed();
    await GluwaAccountModel.deployed();
    this.Gluwacoin = await ethers.getContractFactory("SandboxGluwacoin");
    this.Gluwacoin2 = await ethers.getContractFactory("SandboxGluwacoin");
    this.PrizeLinkedAccountVault = await ethers.getContractFactory("SandboxPrizeLinkedAccountVault");
    [owner, user1, bank1, bank2] = await ethers.getSigners();
    ownerAddress = owner.address;
  });

  beforeEach(async function () {
    gluwaCoin = await this.Gluwacoin.deploy(name, symbol, decimals);
    gluwaCoin2 = await this.Gluwacoin2.deploy(name, symbol, decimals);
    prizeLinkedAccountVault = await this.PrizeLinkedAccountVault.deploy();
    await gluwaCoin.deployed();
    await gluwaCoin2.deployed();
    await prizeLinkedAccountVault.deployed();
    gluwaCoinAddress = gluwaCoin.address;
    prizeLinkedAccountVault.address = prizeLinkedAccountVault.address;
    prizeLinkedAccountVault.initialize(ownerAddress, gluwaCoinAddress, standardInterestRate,
      standardInterestRatePercentageBase, budget, ticketPerToken,
      cutOffHour, cutOffMinute, processingCap, ticketRangeFactor, lowerLimitPercentage);
    gluwaCoin.mint(ownerAddress, large_mintAmount);
    gluwaCoin.mint(user1.address, large_mintAmount);
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, large_mintAmount);
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
      console.info(ticket_upper);

    expect(upper).to.equal(ticket_upper);
    expect(lower).to.equal(ticket_lower);
    expect(owner).to.equal(ticket_owner);
    expect(owner).to.equal(user1.address);

    expect(testHelper.getTimeFromTimestamp(drawDate)).to.equal("17:00:00");   
    var range = BigInt(upper) - BigInt(lower);
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

      var range = BigInt(upper) - BigInt(lower);
      expect(range).to.equal((depositAmount / decimalsVal));
      expect(owner).to.equal(temp.address);
      expect(testHelper.getTimeFromTimestamp(drawDate)).to.equal("17:00:00");

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

    console.info(winningTicket);
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

      // console.info(ticketEvent[2]);

      // console.info(ticketEvent[3]);
      // console.info(ticketEvent[4]);
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



