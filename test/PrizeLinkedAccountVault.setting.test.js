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
var bank1;
var bank2;
var mintAmount = BigInt(2000000) * testHelper.decimalsVal;
var depositAmount = BigInt(30000) * testHelper.decimalsVal;
var prizeLinkedAccountVault;
var gluwaCoin;
var gluwaCoin2;


// Start test block
describe('Gluwacoin', function () {
  before(async function () {
    [owner, user1, bank1, bank2, user2, user3, lender] = await ethers.getSigners();
  });

  beforeEach(async function () {
    [prizeLinkedAccountVault, gluwaCoin, gluwaCoin2] = await testHelper.setupContractTesting(owner, user1, user2, mintAmount, depositAmount);
  });


  it('check if setting is correctly done after initialization', async function () {

    await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      1,
      testHelper.lowerLimitPercentage
    );


    const {
      0: standardInterestRate_1,
      1: standardInterestRatePercentageBase_1,
      2: budget_1,
      3: minimumDeposit_1,
      4: token_1,
      5: ticketPerToken_1,
      6: cutOffHour_1,
      7: cutOffMinute_1,
      8: processingCap_1,
      9: ticketRangeFactor_1,
      10: lowerLimitPercentage_1
    } = await prizeLinkedAccountVault.getPrizeLinkedAccountSettings();

    expect(standardInterestRate_1).to.equal(testHelper.standardInterestRate);
    expect(standardInterestRatePercentageBase_1).to.equal(testHelper.standardInterestRatePercentageBase);
    expect(budget_1).to.equal(testHelper.budget);
    expect(minimumDeposit_1).to.equal(1);
    expect(token_1).to.equal(gluwaCoin.address);
    expect(ticketPerToken_1).to.equal(1);
    expect(cutOffHour_1).to.equal(testHelper.cutOffHour);
    expect(cutOffMinute_1).to.equal(testHelper.cutOffMinute);
    expect(processingCap_1).to.equal(testHelper.processingCap);
    expect(ticketRangeFactor_1).to.equal(1);
    expect(lowerLimitPercentage_1).to.equal(testHelper.lowerLimitPercentage);

  });

  it('check if setting is correctly updated', async function () {

    const standardInterestRate_0 = 19;
    const standardInterestRatePercentageBase_0 = 100;
    const budget_0 = 712211;
    const minimumDeposit_0 = 32;
    const ticketPerToken_0 = 3;
    const cutOffHour_0 = 11;
    const cutOffMinute_0 = 22;
    const processingCap_0 = 212;
    const ticketRangeFactor_0 = 3;
    const lowerLimitPercentage_0 = 51;


    await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      standardInterestRate_0,
      standardInterestRatePercentageBase_0,
      budget_0,
      minimumDeposit_0,
      ticketPerToken_0,
      cutOffHour_0,
      cutOffMinute_0,
      processingCap_0,
      ticketRangeFactor_0,
      lowerLimitPercentage_0
    );

    const {
      0: standardInterestRate_1,
      1: standardInterestRatePercentageBase_1,
      2: budget_1,
      3: minimumDeposit_1,
      4: token_1,
      5: ticketPerToken_1,
      6: cutOffHour_1,
      7: cutOffMinute_1,
      8: processingCap_1,
      9: ticketRangeFactor_1,
      10: lowerLimitPercentage_1
    } = await prizeLinkedAccountVault.getPrizeLinkedAccountSettings();

    expect(standardInterestRate_1).to.equal(standardInterestRate_0);
    expect(standardInterestRatePercentageBase_1).to.equal(standardInterestRatePercentageBase_0);
    expect(budget_1).to.equal(budget_0);
    expect(minimumDeposit_1).to.equal(minimumDeposit_0);
    expect(token_1).to.equal(gluwaCoin.address);
    expect(ticketPerToken_1).to.equal(ticketPerToken_0);
    expect(cutOffHour_1).to.equal(cutOffHour_0);
    expect(cutOffMinute_1).to.equal(cutOffMinute_0);
    expect(processingCap_1).to.equal(processingCap_0);
    expect(ticketRangeFactor_1).to.equal(ticketRangeFactor_0);
    expect(lowerLimitPercentage_1).to.equal(lowerLimitPercentage_0);
  });
});