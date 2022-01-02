const { ContractFactory } = require('@ethersproject/contracts');
const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./shared');

use(solidity);

const name = 'Gluwabond';
const symbol = 'Gluwabond';
const decimals = 18;
const standardMaturityTerm = 31536000; //365 days in timestamp
const standardInterestRate = 15;
const standardInterestRatePercentageBase = 100;
const TOTAL_SECONDS_PER_DAY = 86400;
const TICKET_ACTIVE_STAGE = 1;
const TICKET_EXPIRED_STAGE = 2;
const TICKET_WON_STAGE = 3;
const ACCOUNT_ACTIVE_STAGE = 1;
const ACCOUNT_DEFAULT_STAGE = 2;
const ACCOUNT_LOCKED_STAGE = 3;
const EPOCH_TIMESTAMP_1YEAR_AGO = Date.now() - standardMaturityTerm;
const transferFee = 1000;
const withdrawFee = 5;
const withdrawFeePercentageBase = 1000;
const INVESTMENT_AMOUNT = 7000;
const lowerLimitPercentage = 30;
const decimalsVal = BigInt(10) ** BigInt(decimals);
const budget = BigInt(20000000000) * decimalsVal;

var ownerAddress;
var owner;
var user1;
var gluwaCoinAddress;
var prizeLinkedAccountVaultAddress;
var large_mintAmount = BigInt(2000000000) * decimalsVal;
var large_depositBaseAmount = BigInt(700000);
var depositAmount = large_depositBaseAmount * decimalsVal;
var large_depositAmount = large_depositBaseAmount * decimalsVal * BigInt(10);
var targetAccountCreated = 2000;
var tokenPerTicket = 1;
var ticketValidityTargetBlock = 20;
var prizeLinkedAccountVault;
var totalTicketPerBatch = 272;
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
      standardInterestRatePercentageBase, standardMaturityTerm, budget, tokenPerTicket, ticketValidityTargetBlock, totalTicketPerBatch);
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
    var upper = BigInt(ticketEvent[3]);
    var lower = BigInt(ticketEvent[4]);


    const { 0: ticket_idx,
      1: ticket_owner,
      2: ticket_upper,
      3: ticket_lower } = (await prizeLinkedAccountVault.getTicketById(ticketId));

    expect(upper).to.equal(ticket_upper.toString());
    expect(lower).to.equal(ticket_lower.toString());
    expect(owner).to.equal(ticket_owner);
    expect(owner).to.equal(user1.address);

    expect(testHelper.getTimeFromTimestamp(drawDate)).to.equal("17:00:00");
    expect(upper - lower).to.equal(large_depositAmount);

  });


});

it('create multiple prize-linked accounts with many tickets', async function () {


  for (var i = 0; i < targetAccountCreated; i++) {
    var temp = await ethers.Wallet.createRandom();
    console.info(temp.address);
    console.info(gluwaCoin);
    await gluwaCoin.mint(temp.address, large_mintAmount);
    await bank1.sendTransaction({
      to: temp.address,
      value: ethers.utils.parseEther(1)
    });
    await gluwaCoin.connect(temp).approve(prizeLinkedAccountVaultAddress, depositAmount);
    console.info(temp.address);

    var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(temp.address, smallDepositAmount, temp.address);
    var receipt = await accountTxn.wait();

    var ticketEvent = receipt.events.filter(function (one) {
      return one.event == "CreateTicket";
    })[0].args;

    var drawDate = ticketEvent[0];
    var ticketId = ticketEvent[1];
    var owner = ticketEvent[2];
    var upper = BigInt(ticketEvent[3]);
    var lower = BigInt(ticketEvent[4]);

    expect(upper - lower).to.equal(large_depositAmount);
    expect(owner).to.equal(user1.address);
    expect(testHelper.getTimeFromTimestamp(drawDate)).to.equal("17:00:00");

  }



});



