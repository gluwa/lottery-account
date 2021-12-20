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
var depositAmount = BigInt(200) * decimalsVal;
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

  it('check base token balance user1', async function () {
    const balance = await gluwaCoin.balanceOf(user1.address);

    expect(await gluwaCoin.balanceOf(user1.address)).to.equal(mintAmount);
  });

  it('check allowance balance user1', async function () {
    expect((await gluwaCoin.allowance(user1.address, prizeLinkedAccountVaultAddress))).to.equal(depositAmount);
  });

  it('check return of create prize-linked account', async function () {
    const result = (await prizeLinkedAccountVault.callStatic.createPrizedLinkAccount(user1.address, depositAmount, user1.address));
    expect(result).to.equal(true);
  });

  it('get prize-linked account info', async function () {
    var currentTime = Math.floor(Date.now()/1000);
    var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, depositAmount, user1.address);
    var receipt = await accountTxn.wait();

    var depositHash = receipt.events.filter(function (one) {
      return one.event == "CreateDeposit";
    })[0].args[0];

    var ticketTxn = await prizeLinkedAccountVault.createPrizedLinkTickets(depositHash);
    var txnBlock = ticketTxn.blockNumber;

    const { 0: savingAccount_idx,
      1: savingAccount_hash,
      2: savingAccount_owner,
      3: savingAccount_interestRate,
      4: savingAccount_interestRatePercentageBase,
      5: savingAccount_creationDate,
      6: savingAccount_totalDeposit,
      7: savingAccount_yield,
      8: savingAccount_state,
      9: savingAccount_securityReferenceHash } = (await prizeLinkedAccountVault.getSavingAcountFor(user1.address));


    expect(savingAccount_owner).to.equal(user1.address);
    expect(savingAccount_state).to.equal(ACCOUNT_ACTIVE_STAGE);
    expect(savingAccount_totalDeposit).to.equal(depositAmount);

    var ticketList = (await prizeLinkedAccountVault.getValidTicketIdFor(user1.address));
    var firstTicketId = ticketList[0];
    const {
      0: idx,
      1: owner,
      2: creationDate,
      3: drawnDate,
      4: targetBlockNumber,
      5: state
    } = await prizeLinkedAccountVault.getTicketById(firstTicketId);

    expect(owner).to.equal(user1.address);
    expect(state).to.equal(TICKET_ACTIVE_STAGE);
    expect(targetBlockNumber).to.equal(txnBlock + ticketValidityTargetBlock);
    expect(parseInt(creationDate)).to.greaterThan(currentTime);
    expect(parseInt(drawnDate)).to.greaterThan(parseInt(creationDate));

    for (var i = 1; i < ticketList.length; i++) {
      expect(ticketList[i].owner).to.equal(user1.address);
      expect(ticketList[i].state).to.equal(TICKET_ACTIVE_STAGE);
      expect(ticketList[i].targetBlockNumber).to.equal(targetBlockNumber);
      expect(parseInt(ticketList[i].creationDate)).to.equal(creationDate);
      expect(parseInt(ticketList[i].drawnDate)).to.equal(parseInt(drawnDate));
    }

    var k = ticketList.length;
    ticketTxn = await prizeLinkedAccountVault.createPrizedLinkTickets(depositHash);
    txnBlock = ticketTxn.blockNumber;
    ticketList = (await prizeLinkedAccountVault.getValidTicketIdFor(user1.address));
    for (var i = k; i < ticketList.length; i++) {
      expect(ticketList[i].owner).to.equal(user1.address);
      expect(ticketList[i].state).to.equal(TICKET_ACTIVE_STAGE);
      expect(ticketList[i].targetBlockNumber).to.equal(txnBlock + ticketValidityTargetBlock);
      expect(parseInt(ticketList[i].creationDate)).to.equal(creationDate);
      expect(parseInt(ticketList[i].drawnDate)).to.equal(parseInt(drawnDate));
    }

    expect(BigInt(ticketList.length)).to.equal(BigInt(depositAmount / decimalsVal));


  });

  it('measure the total deposit into contract', async function () {
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVaultAddress, depositAmount * BigInt(10));
    await gluwaCoin.connect(user2).approve(prizeLinkedAccountVaultAddress, depositAmount * BigInt(10));
    
    await prizeLinkedAccountVault.createPrizedLinkAccount(user2.address, depositAmount * BigInt(3), user2.address);


    expect((await prizeLinkedAccountVault.getCurrentTotalDeposit())).to.equal(depositAmount * 7 + 17);
  });

  it('each address must have only one saving account', async function () {
    await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, depositAmount / BigInt(2), user1.address);
    try {
      await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, depositAmount / BigInt(2), user1.address);
      throw "error";
    }
    catch (error) {
      expect(String(error)).to.contain("GluwaSavingAccount: Each address should have only 1 Saving account only");
    }

  });

  it('identity hash is reused', async function () {
    await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, depositAmount / BigInt(2), user1.address);
    try {
      await prizeLinkedAccountVault.createPrizedLinkAccount(user2.address, depositAmount / BigInt(2), user1.address);
      throw "error";
    }
    catch (error) {
      expect(String(error)).to.contain("GluwaSavingAccount: Identity hash is already used");
    }

  });
});