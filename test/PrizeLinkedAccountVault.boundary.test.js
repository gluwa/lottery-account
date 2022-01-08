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
const standardMaturityTerm = 31536000; //365 days in timestamp
const standardInterestRate = 15;
const standardInterestRatePercentageBase = 100;
const ACCOUNT_ACTIVE_STAGE = 1;
const ACCOUNT_DEFAULT_STAGE = 2;
const ACCOUNT_LOCKED_STAGE = 3;
const transferFee = 1000;
const withdrawFee = 5;
const withdrawFeePercentageBase = 1000;
const INVESTMENT_AMOUNT = 7000;
const lowerLimitPercentage = 30;
const cutOffHour = 16;
const cutOffMinute = 59;
const ticketRangeFactor = 1000000;
const decimalsVal = BigInt(10) ** BigInt(decimals);
const budget = BigInt(20000000000) * decimalsVal;

var ownerAddress;
var owner;
var user1;
var bank1;
var bank2;
var gluwaCoinAddress;
var prizeLinkedAccountVaultAddress;
var large_mintAmount = BigInt(2000000000) * decimalsVal;
var large_depositBaseAmount = BigInt(700000);
var depositAmount = large_depositBaseAmount * decimalsVal;
var large_depositAmount = large_depositBaseAmount * decimalsVal * BigInt(10);
var targetAccountCreated = 3;
//var targetAccountCreated = 3000; //Tested
var tokenPerTicket = 1;
var ticketValidityTargetBlock = 20;
var prizeLinkedAccountVault;
var processingCap = 272;
var gluwaCoin;
var gluwaCoin2;
var convertAmount = 50;
var PrizeLinkedAccountVault;

// Start test block
describe('Gluwacoin', function () {
  before(async function () {
    this.GluwaAccountModel = await ethers.getContractFactory("GluwaAccountModel");
    this.DateTimeModel = await ethers.getContractFactory("DateTimeModel");
    var GluwaAccountModel = await this.GluwaAccountModel.deploy();
    var DateTimeModel = await this.DateTimeModel.deploy();
    await DateTimeModel.deployed();
    await GluwaAccountModel.deployed();
    this.Gluwacoin = await ethers.getContractFactory("SandboxGluwacoin");
    this.Gluwacoin2 = await ethers.getContractFactory("SandboxGluwacoin");
    this.PrizeLinkedAccountVault = await ethers.getContractFactory("SandboxPrizeLinkedAccountVault", {
      libraries: {
        GluwaAccountModel: GluwaAccountModel.address,
        DateTimeModel: DateTimeModel.address
      },
    });
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
    prizeLinkedAccountVaultAddress = prizeLinkedAccountVault.address;
    prizeLinkedAccountVault.initialize(ownerAddress, gluwaCoinAddress, standardInterestRate,
      standardInterestRatePercentageBase, standardMaturityTerm, budget, tokenPerTicket, 
       cutOffHour, cutOffMinute, processingCap, ticketRangeFactor);
    gluwaCoin.mint(ownerAddress, large_mintAmount);
    gluwaCoin.mint(user1.address, large_mintAmount);
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVaultAddress, large_mintAmount);
  });



  it('create prize-linked account with many tickets', async function () {
    var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, large_depositAmount, user1.address);
    var receipt = await accountTxn.wait();

    var ticketEvent = receipt.events.filter(function (one) {
      return one.event == "CreateTicket";
    })[0].args;

    var drawDate = ticketEvent[0];
    var ticketId = ticketEvent[1];
    var owner = ticketEvent[2];
    var lower = ticketEvent[3];
    var upper = ticketEvent[4];

    console.info(upper);
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
    var balance = await gluwaCoin.balanceOf(prizeLinkedAccountVaultAddress);
    for (var i = 0; i < targetAccountCreated; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, large_mintAmount);
      await bank1.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVaultAddress, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(temp.address, depositAmount, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "CreateTicket";
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

    expect((await gluwaCoin.balanceOf(prizeLinkedAccountVaultAddress)).toString()).to.equal((BigInt(balance) + BigInt(targetAccountCreated) * depositAmount).toString());
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
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVaultAddress, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(temp.address, depositAmount, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "CreateTicket";
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
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVaultAddress, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(temp.address, depositAmount, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "CreateTicket";
      })[0].args;

      var drawDateTemp = ticketEvent[0];

      console.info(ticketEvent[3]);
      console.info(ticketEvent[4]);
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
    
 
    await prizeLinkedAccountVault.awardWinnerV1(drawDate);
    

  });


});



