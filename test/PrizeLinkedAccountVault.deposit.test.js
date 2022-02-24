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
var mintAmount = BigInt(2000000) * testHelper.decimalsVal;
var depositAmount = BigInt(200) * testHelper.decimalsVal;
var prizeLinkedAccountVault;
var gluwaCoin;
var gluwaCoin2;

// Start test block
describe('Deposit test', function () {
  before(async function () {
    [owner, user1, bank1, bank2, user2, user3, lender] = await ethers.getSigners();
  });

  beforeEach(async function () {
    [prizeLinkedAccountVault, gluwaCoin, gluwaCoin2] = await testHelper.setupContractTesting(owner, user1, user2, mintAmount, depositAmount);
  });

  it('check base token balance user1', async function () {
    const balance = await gluwaCoin.balanceOf(user1.address);

    expect(await gluwaCoin.balanceOf(user1.address)).to.equal(mintAmount);
  });

  it('check allowance balance user1', async function () {
    expect((await gluwaCoin.allowance(user1.address, prizeLinkedAccountVault.address))).to.equal(depositAmount);
  });

  it('check return of create prize-linked account', async function () {
    const result = (await prizeLinkedAccountVault.callStatic["createPrizedLinkAccount(address,uint256,bytes)"](user1.address, depositAmount, user1.address));
    expect(result).to.equal(true);
  });
  it('depositHash should be different even with same user same amount', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount / BigInt(2), user1.address);
    var lastHash;
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, depositAmount * BigInt(10));
    for(var i=0;i<10;i++){
      txn = await testHelper.depositPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount);
      receipt = await txn.wait();
      var depositHash = receipt.events.filter(function (one) {
        return one.event == "DepositCreated";
      })[0].args[0];
      expect(depositHash).to.not.equal(lastHash);
      lastHash = depositHash;
    }

  });
  
  it('get prize-linked account info', async function () {
    var currentTime = Math.floor(Date.now() / 1000);
    var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
    var receipt = await accountTxn.wait();

    var depositHash = receipt.events.filter(function (one) {
      return one.event == "DepositCreated";
    })[0].args[0];

    const { 0: savingAccount_idx,
      1: savingAccount_hash,
      2: savingAccount_owner,
      3: savingAccount_creationDate,
      4: savingAccount_balance,
      5: savingAccount_earning,
      6: savingAccount_state,
      7: savingAccount_securityReferenceHash } = (await prizeLinkedAccountVault.getSavingAcountFor(user1.address));

    expect(savingAccount_owner).to.equal(user1.address);
    expect(savingAccount_state).to.equal(testHelper.ACCOUNT_ACTIVE_STAGE);
    expect(savingAccount_balance).to.equal(depositAmount);

    var ticketEvent = receipt.events.filter(function (one) {
      return one.event == "TicketCreated";
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


    expect(testHelper.getTimeFromTimestamp(drawDate)).to.equal("17:00:00");
    var timeStampDiff = drawDate - parseInt(deposit_creationDate);
    expect(timeStampDiff).to.greaterThan(testHelper.TOTAL_SECONDS_PER_DAY);
    expect(2 * testHelper.TOTAL_SECONDS_PER_DAY).to.greaterThan(timeStampDiff);

    var range = BigInt(upper) - BigInt(lower);
    expect(range).to.equal((depositAmount / testHelper.decimalsVal));
    expect(deposit_amount).to.equal(depositAmount);

    const { 0: ticket_idx,
      1: ticket_owner,
      2: ticket_lower,
      3: ticket_upper } = (await prizeLinkedAccountVault.getTicketRangeById(ticketId));

    expect(upper).to.equal(ticket_upper);
    expect(lower).to.equal(ticket_lower);
    expect(owner).to.equal(ticket_owner);
    expect(owner).to.equal(user1.address);

  });

  it('measure the total deposit into contract', async function () {
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, depositAmount * BigInt(10));
    await gluwaCoin.connect(user2).approve(prizeLinkedAccountVault.address, depositAmount * BigInt(10));

    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount * BigInt(4), user1.address);
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user2.address, depositAmount * BigInt(3), user2.address);


    expect((await gluwaCoin.balanceOf(prizeLinkedAccountVault.address))).to.equal(depositAmount * BigInt(7));
  });

  it('multiple deposits into one account', async function () {
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, depositAmount * BigInt(10));

    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount * BigInt(4), user1.address);
    await testHelper.depositPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount * BigInt(3));
    await testHelper.depositPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount * BigInt(2));


    expect((await gluwaCoin.balanceOf(prizeLinkedAccountVault.address))).to.equal(depositAmount * BigInt(9));
  });

  it('each address must have only one saving account', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount / BigInt(2), user1.address);
    try {
      await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount / BigInt(2), user1.address);
      throw "error";
    }
    catch (error) {
      expect(String(error)).to.contain("GluwaSavingAccount: Each address should have only 1 Saving account only");
    }

  });

  it('identity hash is reused', async function () {
    await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount / BigInt(2), user1.address);
    try {
      await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user2.address, depositAmount / BigInt(2), user1.address);
      throw "error";
    }
    catch (error) {
      expect(String(error)).to.contain("GluwaSavingAccount: Identity hash is already used");
    }

  });
});