const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./shared');

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
const blockNumbeFactor = 2;
const ticketRangeFactor = 1000000;
const decimalsVal = BigInt(10) ** BigInt(decimals);
const budget = BigInt(20000000000) * decimalsVal;

var ownerAddress;
var owner;
var user1;
var user2;
var user3;
var gluwaCoinAddress;
var prizeLinkedAccountVaultAddress;
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
      standardInterestRatePercentageBase, standardMaturityTerm, budget, tokenPerTicket, ticketValidityTargetBlock, totalTicketPerBatch, blockNumbeFactor, ticketRangeFactor);
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
    var currentTime = Math.floor(Date.now() / 1000);
    var accountTxn = await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, depositAmount, user1.address);
    var receipt = await accountTxn.wait();

    var depositHash = receipt.events.filter(function (one) {
      return one.event == "CreateDeposit";
    })[0].args[0];

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

    var ticketEvent = receipt.events.filter(function (one) {
      return one.event == "CreateTicket";
    })[0].args;

    var drawDate = ticketEvent[0];
    var ticketId = ticketEvent[1];
    var owner = ticketEvent[2];
    var lower = ticketEvent[3];
    var upper = ticketEvent[4];       

    const { 0: deposit_idx,
      1: deposit_accountId,
      2: deposit_owner,
      3: deposit_creationDate,
      4: deposit_amount } = (await prizeLinkedAccountVault.getDeposit(depositHash));

    console.info(deposit_creationDate);

    expect(testHelper.getTimeFromTimestamp(drawDate)).to.equal("17:00:00");
    var timeStampDiff = drawDate - parseInt(deposit_creationDate);
    expect(timeStampDiff).to.greaterThan(testHelper.TOTAL_SECONDS_PER_DAY);
    expect(2 * testHelper.TOTAL_SECONDS_PER_DAY).to.greaterThan(timeStampDiff);

    var range = BigInt(upper) - BigInt(lower);
    expect(range).to.equal((depositAmount / decimalsVal));
    expect(deposit_amount).to.equal(depositAmount);

    const { 0: ticket_idx,
      1: ticket_owner,
      2: ticket_lower,
      3: ticket_upper    } = (await prizeLinkedAccountVault.getTicketById(ticketId));

      expect(upper).to.equal(ticket_upper);
      expect(lower).to.equal(ticket_lower);
      expect(owner).to.equal(ticket_owner);
      expect(owner).to.equal(user1.address);

  });

  it('measure the total deposit into contract', async function () {
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVaultAddress, depositAmount * BigInt(10));
    await gluwaCoin.connect(user2).approve(prizeLinkedAccountVaultAddress, depositAmount * BigInt(10));

    await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, depositAmount * BigInt(4), user1.address);
    await prizeLinkedAccountVault.createPrizedLinkAccount(user2.address, depositAmount * BigInt(3), user2.address);


    expect((await prizeLinkedAccountVault.getCurrentTotalDeposit())).to.equal(depositAmount * BigInt(7));
  });

  it('multiple deposits into one account', async function () {
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVaultAddress, depositAmount * BigInt(10));

    await prizeLinkedAccountVault.createPrizedLinkAccount(user1.address, depositAmount * BigInt(4), user1.address);
    await prizeLinkedAccountVault.depositPrizedLinkAccount(user1.address, depositAmount * BigInt(3));
    await prizeLinkedAccountVault.depositPrizedLinkAccount(user1.address, depositAmount * BigInt(2));


    expect((await prizeLinkedAccountVault.getCurrentTotalDeposit())).to.equal(depositAmount * BigInt(9));
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