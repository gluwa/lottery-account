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
var user2;
var user3;
var gluwaCoinAddress;
var prizeLinkedAccountVaultAddress;
var decimalsVal = BigInt(10) ** BigInt(decimals);
var mintAmount = BigInt(2000000) * decimalsVal;
var depositBaseAmount = BigInt(5000);
var depositAmount = depositBaseAmount * decimalsVal;
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
    [owner, user1, user2, user3, lender] = await ethers.getSigners();
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
    gluwaCoin.mint(ownerAddress, mintAmount);
    gluwaCoin.mint(user1.address, mintAmount);
    gluwaCoin.mint(user2.address, mintAmount);
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVaultAddress, depositAmount);
    await gluwaCoin.connect(user2).approve(prizeLinkedAccountVaultAddress, depositAmount);
  });

  // it('check roles for owner', async function () {
  //   expect((await prizeLinkedAccountVault.isOperator(ownerAddress))).to.equal(true);
  //   expect((await prizeLinkedAccountVault.isController(ownerAddress))).to.equal(true);
  //   expect((await prizeLinkedAccountVault.isAdmin(ownerAddress))).to.equal(true);
  // });

  

  it('create prize-linked account with many tickets', async function () {
    var currentTime = Math.floor(Date.now()/1000);
    var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, depositAmount, user1.address);
    var receipt = await accountTxn.wait();

    var depositHash = receipt.events.filter(function (one) {
      return one.event == "CreateDeposit";
    })[0].args[0];

    var txn = await prizeLinkedAccountVault.createPrizedLinkTickets(depositHash);
    var receiptPackedTransaction = await ethers.provider.getTransactionReceipt(txn.hash);
    console.info(BigInt(receiptPackedTransaction.gasUsed._hex));  


  });

  
});