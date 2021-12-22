const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');

use(solidity);

const name = 'Gluwabond';
const symbol = 'Gluwabond';
const decimals = 18;
const standardMaturityTerm = 31536000; //365 days in timestamp
const standardInterestRate = 15;
const standardInterestRatePercentageBase = 100;
const budget = 2000000;
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

var ownerAddress;
var owner;
var user1;
var gluwaCoinAddress;
var prizeLinkedAccountVaultAddress;
var decimalsVal = BigInt(10) ** BigInt(decimals);
var mintAmount = BigInt(2000000) * decimalsVal;
var depositBaseAmount = BigInt(7000);
var depositAmount = depositBaseAmount * decimalsVal;
var smallDepositBaseAmount = BigInt(100000);
var smallDepositAmount = smallDepositBaseAmount * decimalsVal;
var targetAccountCreated = 30;
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
    [owner, user1] = await ethers.getSigners();
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
    gluwaCoin.mint(ownerAddress, depositAmount);
    gluwaCoin.mint(user1.address, depositAmount);
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVaultAddress, depositAmount);
  });



  it('create prize-linked account with many tickets', async function () {
    var currentTime = Math.floor(Date.now() / 1000);
    var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, depositAmount, user1.address);
    var receipt = await accountTxn.wait();

    var depositHash = receipt.events.filter(function (one) {
      return one.event == "CreateDeposit";
    })[0].args[0];
    var processed = 0;
    while (processed < depositBaseAmount) {
      await prizeLinkedAccountVault.createPrizedLinkTickets(depositHash);
      processed += totalTicketPerBatch;
    }

    var ticketList = (await prizeLinkedAccountVault.getValidTicketIdFor(user1.address));
    console.info(ticketList.length);



  });

  it('create prize-linked account with many tickets', async function () {


    for (var i = 0; i < targetAccountCreated; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, depositAmount);
      await gluwaCoin.connect(temp).approve(prizeLinkedAccountVaultAddress, depositAmount);
      var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(temp.address, smallDepositAmount, temp.address);
      var receipt = await accountTxn.wait();
      var depositHash = receipt.events.filter(function (one) {
        return one.event == "CreateDeposit";
      })[0].args[0];
      var processed = 0;
      while (processed < smallDepositBaseAmount) {
        await prizeLinkedAccountVault.createPrizedLinkTickets(depositHash);
        processed += totalTicketPerBatch;
      }
    }



  });



});