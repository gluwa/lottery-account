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
const blockNumbeFactor = 2;
const ticketRangeFactor = 1000000;
const decimalsVal = BigInt(10) ** BigInt(decimals);
const budget = BigInt(20000000000) * decimalsVal;

var ownerAddress;
var owner;
var user1;
var user2;
var user3;
var bank1;
var bank2;
var gluwaCoinAddress;
var prizeLinkedAccountVaultAddress;
var mintAmount = BigInt(2000000) * decimalsVal;
var depositAmount = BigInt(30000) * decimalsVal;
var tokenPerTicket = 1;
var ticketValidityTargetBlock = 20;
var prizeLinkedAccountVault;
var totalTicketPerBatch = 110;
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
    [owner, user1, bank1, bank2, user2, user3, lender] = await ethers.getSigners();
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
      standardInterestRatePercentageBase, standardMaturityTerm, budget, tokenPerTicket, ticketValidityTargetBlock, totalTicketPerBatch, blockNumbeFactor, ticketRangeFactor);
    gluwaCoin.mint(ownerAddress, mintAmount);
    gluwaCoin.mint(user1.address, mintAmount);
    gluwaCoin.mint(user2.address, mintAmount);
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVaultAddress, depositAmount);
    await gluwaCoin.connect(user2).approve(prizeLinkedAccountVaultAddress, depositAmount);
  });




  it('check ticket allocation and participants', async function () {
    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < 30; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
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


    var { 0: owners, 1: tickets } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    expect(totalInDraw).to.equal(owners.length);
    expect(totalInDraw).to.equal(tickets.length);
  });


  it('check max min for a draw', async function () {
    var totalInDraw = 0;
    var drawDate = BigInt(0);
    var lower = BigInt(0);
    var upper = BigInt(0);
    for (var i = 0; i < 10; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
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
        lower = ticketEvent[3];
      }
      else if (drawDate < drawDateTemp) {
        break;
      }
      upper = ticketEvent[4];

    }


    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);

    expect(upper).to.equal(max);
    expect(lower).to.equal(min);

  });

  it('check if each participant having valid tickets', async function () {
    var drawDate = BigInt(0);
    for (var i = 0; i < 30; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
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
    }

    var { 0: owners, 1: tickets } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    for (var i = 0; i < tickets.length; i++) {
      var { 0: ticket_idx,
        1: ticket_owner,
        2: ticket_lower,
        3: ticket_upper } = (await prizeLinkedAccountVault.getTicketById(tickets[i]));
      expect(ticket_owner).to.equal(owners[i]);
      expect(ticket_idx).to.equal(tickets[i]);
    }
  });

  it('check if winning number within max and min - seed is 0', async function () {
    var drawDate = BigInt(0);
    for (var i = 0; i < 10; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
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
    }

    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    var winningticket = await prizeLinkedAccountVault.callStatic.findDrawWinnerV1(drawDate,0);

    expect(winningticket).to.be.bignumber.at.least(min);
    expect(winningticket).to.be.bignumber.at.most(max);

  });

  it('check if winning number within max and min - seed not 0', async function () {
    var drawDate = BigInt(0);
    for (var i = 0; i < 10; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
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
    }
    const randomMax = 99999999;
    const randomMin = 10000000;
    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    var winningticket = await prizeLinkedAccountVault.callStatic.findDrawWinnerV1(drawDate,Math.floor(Math.random() * (randomMax - randomMin0) + randomMin));

    expect(winningticket).to.be.bignumber.at.least(min);
    expect(winningticket).to.be.bignumber.at.most(max);

  });


});