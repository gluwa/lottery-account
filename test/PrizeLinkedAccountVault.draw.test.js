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
describe('Prize Draw', function () {
  before(async function () {
    [owner, user1, bank1, bank2, user2, user3, lender] = await ethers.getSigners();
  });

  beforeEach(async function () {
    [prizeLinkedAccountVault, gluwaCoin, gluwaCoin2] = await testHelper.setupContractTesting(owner, user1, user2, mintAmount, depositAmount);
  });

  it('verify prize balance grows properly across multiple days', async () => {
    const createAccountReceipt = await testHelper.createPrizeLinkedAccountStandard(
      prizeLinkedAccountVault, 
      user1.address,
      depositAmount,
      user1.address).then(tx=>tx.wait());
    
    const drawDate = BigInt(createAccountReceipt.events
      .filter(event=>event.event=="TicketCreated")[0].args[0]);      

    //Make 1st draw, make sure no winner is drawn
    await prizeLinkedAccountVault.makeDrawV1_Dummy(drawDate, 999999999999999);
    
    //Award winner, but there is no winner so prize should roll forward
    await prizeLinkedAccountVault.awardWinnerV1(drawDate);

    //expect initial prize to equal depositAmount * (interestRate/interestRateBase)
    const initialPrize = await prizeLinkedAccountVault.getAmountBroughtToNextDraw();
    const expectedInitialPrize = 
      depositAmount * BigInt(testHelper.standardInterestRate)/BigInt(testHelper.standardInterestRatePercentageBase);    
    expect(initialPrize).to.be.equal(expectedInitialPrize);
    
    //roll forward to next draw
    const drawDate2 = drawDate + BigInt(testHelper.TOTAL_SECONDS_PER_DAY);

    //regenerate tickets for next draw
    await prizeLinkedAccountVault.regenerateTicketForNextDraw(drawDate2)

    //make 2nd draw, make sure no winner is drawn
    await prizeLinkedAccountVault.makeDrawV1_Dummy(drawDate2, 999999999999999)

    //Award winner, but there is no winner so prize should roll forward
    await prizeLinkedAccountVault.awardWinnerV1(drawDate2)

    //expect second draw prize to equal 2 * depositAmount * (interestRate/interestRateBase)
    const secondDrawPrize = await prizeLinkedAccountVault.getAmountBroughtToNextDraw();
    const expectedSecondDrawPrize = 
      BigInt(2) * depositAmount * BigInt(testHelper.standardInterestRate)/BigInt(testHelper.standardInterestRatePercentageBase);    
    expect(secondDrawPrize).to.be.equal(expectedSecondDrawPrize);
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
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,bytes)"](temp.address, depositAmount, temp.address);
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
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,bytes)"](temp.address, depositAmount, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
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

    var upperFactored = BigInt(upper) + (depositAmount * BigInt(testHelper.winningChanceFactor * 10)) / testHelper.decimalsVal;
    expect(upperFactored).to.equal(max);
    expect(lower).to.equal(min);

  });

  it('check max min for a draw after full withdraw', async function () {
    var drawDate = BigInt(0);
    var lower = BigInt(0);

    var users = [];

    var depositTime = ((Date.now() / 1000) | 0);

    var ticketIds = [];
    for (var i = 0; i < 10; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank1.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      users[i] = temp.address;
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await testHelper.createPrizeLinkedAccountSandBox(prizeLinkedAccountVault, temp.address, depositAmount, depositTime, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
      })[0].args;

      var drawDateTemp = ticketEvent[0];

      if (drawDate == BigInt(0)) {
        drawDate = drawDateTemp;
      }

      ticketIds[i] = ticketEvent[1];
      if (lower == BigInt(0)) {
        drawDate = drawDateTemp;
        lower = ticketEvent[3];
      }

      if (drawDate < drawDateTemp) {
        break;
      }
    }

    await prizeLinkedAccountVault.withdrawFor(users[0], depositAmount);
    await prizeLinkedAccountVault.withdrawFor(users[5], depositAmount);
    await prizeLinkedAccountVault.withdrawFor(users[6], depositAmount);
    await prizeLinkedAccountVault.withdrawFor(users[8], BigInt(23) * testHelper.decimalsVal);
    await prizeLinkedAccountVault.withdrawFor(users[9], depositAmount);


    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    var newUpper = depositAmount * BigInt(9) / testHelper.decimalsVal; //since the latest user withdraw all

    var balance = await prizeLinkedAccountVault.getBalanceEachDraw(drawDate);

    var upperFactored = newUpper + (balance.toBigInt() * BigInt(testHelper.winningChanceFactor)) / testHelper.decimalsVal - BigInt(23) - (depositAmount * BigInt(2)) / testHelper.decimalsVal;
    var balanceTest = (newUpper - min.toBigInt() + BigInt(1)) * testHelper.decimalsVal - (depositAmount * BigInt(2) + BigInt(23) * testHelper.decimalsVal);
    expect(upperFactored).to.equal(max);
    expect(balance).to.equal(balanceTest);
    expect(30001).to.equal(min);

  });

  it('if the current one will be winner if all withdraw and winningChanceFactor = 0', async function () {
    var drawDate = BigInt(0);
    var lower = BigInt(0);

    var users = [];

    var depositTime = ((Date.now() / 1000) | 0);

    var ticketIds = [];
    for (var i = 0; i < 5; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank1.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      users[i] = temp.address;
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await testHelper.createPrizeLinkedAccountSandBox(prizeLinkedAccountVault, temp.address, depositAmount, depositTime, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
      })[0].args;

      var drawDateTemp = ticketEvent[0];

      if (drawDate == BigInt(0)) {
        drawDate = drawDateTemp;
      }

      ticketIds[i] = ticketEvent[1];
      if (lower == BigInt(0)) {
        drawDate = drawDateTemp;
        lower = ticketEvent[3];
      }

      if (drawDate < drawDateTemp) {
        break;
      }
    }

    await prizeLinkedAccountVault.withdrawFor(users[0], depositAmount);
    await prizeLinkedAccountVault.withdrawFor(users[1], depositAmount);
    await prizeLinkedAccountVault.withdrawFor(users[2], depositAmount);
    await prizeLinkedAccountVault.withdrawFor(users[3], BigInt(19) * testHelper.decimalsVal);
    await prizeLinkedAccountVault.withdrawFor(users[4], depositAmount);

    await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      0,
      1,
      testHelper.lowerLimitPercentage
    );


    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    var newUpper = depositAmount * BigInt(9) / testHelper.decimalsVal; //since the latest user withdraw all

    var balance = await prizeLinkedAccountVault.getBalanceEachDraw(drawDate);

    var {
      0: ticketId,
      1: owner,
      2: lower,
      3: upper

    } = await prizeLinkedAccountVault.getTicketRangeById(ticketIds[3]);

    expect(upper).to.equal(max);
    expect(lower).to.equal(min);

    var winningticket = await prizeLinkedAccountVault.callStatic.makeDrawV1_NoValidation(drawDate, 0);

    expect(max - winningticket).to.be.greaterThanOrEqual(0);
    expect(winningticket - min).to.be.greaterThanOrEqual(0);
  });

  it('check if winner can only have 1 ticket - one user', async function () {
    await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      0,
      1,
      testHelper.lowerLimitPercentage
    );

    var depositTime = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
    var totalTickets = BigInt(10);
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, totalTickets * testHelper.decimalsVal);
    var accountTxn = await testHelper.createPrizeLinkedAccountSandBox(prizeLinkedAccountVault, user1.address, testHelper.decimalsVal, depositTime, user1.address);

    var receipt = await accountTxn.wait();
    var ticketEvent = receipt.events.filter(function (one) {
      return one.event == "TicketCreated";
    })[0].args;
    var drawDate = ticketEvent[0];

    for (var i = 0; i < totalTickets - BigInt(1); i++) {
      await testHelper.depositPrizeLinkedAccountSandBox(prizeLinkedAccountVault, user1.address, testHelper.decimalsVal, depositTime);
    }


    var ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

    var totalTickets_1 = BigInt(0);
    for (var i = 0; i < ticketList.length; i++) {
      const {
        0: id,
        1: owner,
        2: lower,
        3: upper
      } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
      totalTickets_1 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
      expect(lower).to.equal(upper);
    }
    expect(totalTickets).to.equal(totalTickets_1);

    await prizeLinkedAccountVault.withdrawFor(user1.address, testHelper.decimalsVal);
    await prizeLinkedAccountVault.withdrawFor(user1.address, testHelper.decimalsVal);
    var totalTickets_2 = BigInt(0);
    for (var i = 0; i < ticketList.length; i++) {
      const {
        0: id,
        1: owner,
        2: lower,
        3: upper
      } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
      if (upper.toNumber() > 0) {
        totalTickets_2 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
      }
      expect(lower).to.equal(upper);
    }
    expect(totalTickets_2).to.equal(BigInt(8));
    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    expect(max).to.equal(totalTickets);

    const randomMax = 99999999;
    const randomMin = 10000000;
    await prizeLinkedAccountVault.makeDrawV1_NoValidation(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
    expect(winner).to.equal(user1.address);
  });

  it('check if winner can only have 1 ticket - multiple users', async function () {
    await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      0,
      1,
      testHelper.lowerLimitPercentage
    );


    var drawDate = BigInt(0);

    var users = [];

    var depositTime = ((Date.now() / 1000) | 0);

    var ticketIds = [];
    for (var i = 0; i < 10; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank1.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      users[i] = temp.address;
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, testHelper.decimalsVal);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await testHelper.createPrizeLinkedAccountSandBox(prizeLinkedAccountVault, temp.address, testHelper.decimalsVal, depositTime, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
      })[0].args;

      var drawDateTemp = ticketEvent[0];

      if (drawDate == BigInt(0)) {
        drawDate = drawDateTemp;
      }

      ticketIds[i] = ticketEvent[1];
      expect(ticketEvent[3]).to.equal(ticketEvent[4]);

      if (drawDate < drawDateTemp) {
        break;
      }
    }

    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    expect(max).to.equal(10);

    const randomMax = 99999999;
    const randomMin = 10000000;
    await prizeLinkedAccountVault.makeDrawV1_NoValidation(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
    expect(winner).not.to.equal(testHelper.ADDRESS_0);
    expect(users.filter(item => item == winner).length).to.equal(1);
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
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,bytes)"](temp.address, depositAmount, temp.address);
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
    }

    var { 0: owners, 1: tickets } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    for (var i = 0; i < tickets.length; i++) {
      var { 0: ticket_idx,
        1: ticket_owner,
        2: ticket_lower,
        3: ticket_upper } = (await prizeLinkedAccountVault.getTicketRangeById(tickets[i]));
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
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,bytes)"](temp.address, depositAmount, temp.address);
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
    }

    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    var winningticket = await prizeLinkedAccountVault.callStatic.makeDrawV1_NoValidation(drawDate, 0);

    expect(max - winningticket).to.be.greaterThanOrEqual(0);
    expect(winningticket - min).to.be.greaterThanOrEqual(0);

    var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_NoValidation(drawDate, 0);
    var receipt = await makeDrawV1Txn.wait();
    expect(receipt.events.length).to.equal(1);
    await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate, receipt.events[0].args['winningTicket'], min, max);
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
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,bytes)"](temp.address, depositAmount, temp.address);
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
    }
    const randomMax = 99999999;
    const randomMin = 10000000;
    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    var winningticket = await prizeLinkedAccountVault.callStatic.makeDrawV1_NoValidation(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));

    expect(max - winningticket).to.be.greaterThanOrEqual(0);
    expect(winningticket - min).to.be.greaterThanOrEqual(0);

    var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_NoValidation(drawDate, 0);
    var receipt = await makeDrawV1Txn.wait();
    expect(receipt.events.length).to.equal(1);
    await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate, receipt.events[0].args['winningTicket'], min, max);
  });

  it('check if winning number within max and min - seed not 0 - makeDrawV2', async function () {
    var depositTime = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY * 2;
    var drawDate = BigInt(0);
    for (var i = 0; i < 10; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank1.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await testHelper.createPrizeLinkedAccountSandBox(prizeLinkedAccountVault, temp.address, depositAmount, depositTime, temp.address);
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
    }
    const randomMax = 99999999;
    const randomMin = 10000000;
    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    var winningticket = await prizeLinkedAccountVault.callStatic.makeDrawV2(drawDate, min, max, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));

    expect(max - winningticket).to.be.greaterThanOrEqual(0);
    expect(winningticket - min).to.be.greaterThanOrEqual(0);

    var makeDrawV2Txn = await prizeLinkedAccountVault.makeDrawV2(drawDate, min, max, 0);
    var receipt = await makeDrawV2Txn.wait();
    expect(receipt.events.length).to.equal(1);
    await expect(makeDrawV2Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate, receipt.events[0].args['winningTicket'], min, max);
  });


  it('verify winner account after drawing', async function () {
    var setPrizeLinkedAccountSettingsTxn = await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      0,
      1,
      testHelper.lowerLimitPercentage
    );
    var receipt = await setPrizeLinkedAccountSettingsTxn.wait();
    // expect(receipt.events.length).to.equal(2);
    await expect(setPrizeLinkedAccountSettingsTxn).to.emit(prizeLinkedAccountVault, "AccountSavinSettingsUpdated").withArgs(
      owner.address,
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      receipt.events[0].args['budget'],
      1,
      1
    );
    expect(BigInt(receipt.events[0].args['budget'])).to.equal(testHelper.budget);
    await expect(setPrizeLinkedAccountSettingsTxn).to.emit(prizeLinkedAccountVault, "GluwaPrizeDrawSettingsUpdated").withArgs(
      owner.address,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      0,
      1,
      receipt.events[1].args['lowerLimitPercentage']
    );
    expect(BigInt(receipt.events[1].args['lowerLimitPercentage'])).to.equal(testHelper.lowerLimitPercentage);

    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < 30; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank2.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,bytes)"](temp.address, depositAmount, temp.address);
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
    var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_NoValidation(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    var receipt2 = await makeDrawV1Txn.wait();
    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);

    await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate, receipt2.events[0].args['winningTicket'], min, max);

    var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
    var balance = await gluwaCoin.balanceOf(winner);

    const { 0: savingAccount_idx,
      1: savingAccount_hash,
      2: savingAccount_owner,
      3: savingAccount_creationDate,
      4: savingAccount_balance,
      5: savingAccount_earning,
      6: savingAccount_state,
      7: savingAccount_securityReferenceHash } = (await prizeLinkedAccountVault.getSavingAcountFor(winner));

    var winnerTxn = await prizeLinkedAccountVault.awardWinnerV1(drawDate);
    var receiptWinner = await winnerTxn.wait();
    var winnerEvent = receiptWinner.events.filter(function (one) {
      return one.event == "WinnerSelected";
    })[0].args;
    var earnt = BigInt(balanceEachDraw) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);

    const { 0: savingAccount_idx1,
      1: savingAccount_hash1,
      2: savingAccount_owner1,
      3: savingAccount_creationDate1,
      4: savingAccount_balance1,
      5: savingAccount_earning1,
      6: savingAccount_state1,
      7: savingAccount_securityReferenceHash1 } = (await prizeLinkedAccountVault.getSavingAcountFor(winner));

    expect(winner).to.equal(winnerEvent[0]);
    expect(earnt).to.equal(winnerEvent[1]);
    expect(savingAccount_earning1).to.equal(winnerEvent[1]);
    var totalAfterWinning = BigInt(savingAccount_balance) + earnt;
    expect(totalAfterWinning).to.equal(savingAccount_balance1);
    expect(balance).to.equal(await gluwaCoin.balanceOf(winner));
  });

  it('verify brought balance if there is no winner', async function () {
    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < 30; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank2.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,bytes)"](temp.address, depositAmount, temp.address);
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
    var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_Dummy(drawDate, 999999999999999);

    var receipt = await makeDrawV1Txn.wait();
    expect(receipt.events.length).to.equal(1);
    await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate, receipt.events[0].args['winningTicket'], 999999999999999, 999999999999999);

    var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);

    var winnerTxn = await prizeLinkedAccountVault.awardWinnerV1(drawDate);
    var receiptWinner = await winnerTxn.wait();
    var winnerEvent = receiptWinner.events.filter(function (one) {
      return one.event == "WinnerSelected";
    })[0].args;
    var earnt = BigInt(balanceEachDraw) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);

    expect(winner).to.equal(winnerEvent[0]);
    expect(earnt).to.equal(winnerEvent[1]);
    expect(earnt).to.equal(await prizeLinkedAccountVault.getAmountBroughtToNextDraw());
  });

  it('verify brought balance will be used if no winner for multiple cycles - same balance every draw', async function () {
    const boostingFund = depositAmount * BigInt(7);
    await gluwaCoin.mint(user3.address, boostingFund);
    await gluwaCoin.connect(user3).approve(prizeLinkedAccountVault.address, boostingFund);
    await prizeLinkedAccountVault.addBoostingFund(user3.address, boostingFund);

    // Balance each draw is unchanged
    const expectedBalanceEachDraw = depositAmount * BigInt(10);
    for (var j = 14; j > 0; j--) {
      var depositTime = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY * j;
      var drawDate = BigInt(0);
      for (var i = 0; i < 10; i++) {
        var temp = await ethers.Wallet.createRandom();
        await gluwaCoin.mint(temp.address, mintAmount);
        await bank2.sendTransaction({
          to: temp.address,
          value: ethers.utils.parseEther("1")
        });
        var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
        await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
        var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime, temp.address);
        var receipt = await accountTxn.wait();

        var ticketEvent = receipt.events.filter(function (one) {
          return one.event == "TicketCreated";
        })[0].args;

        drawDate = ticketEvent[0];
      }
      // the ticket value to ensure no winner
      var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_Dummy(drawDate, 999999999999999);

      var receipt = await makeDrawV1Txn.wait();
      await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate, receipt.events[0].args['winningTicket'], 999999999999999, 999999999999999);
      var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

      // Only check after second draw
      if (j < 14) {
        var previousPrize = BigInt(15 - j - 1) * (BigInt(balanceEachDraw) + boostingFund) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);
        expect(previousPrize).to.equal(await prizeLinkedAccountVault.getAmountBroughtToNextDraw());
      }

      var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
      var winnerTxn = await prizeLinkedAccountVault.awardWinnerV1(drawDate);
      var receiptWinner = await winnerTxn.wait();
      var winnerEvent = receiptWinner.events.filter(function (one) {
        return one.event == "WinnerSelected";
      })[0].args;

      var prize = BigInt(15 - j) * (BigInt(balanceEachDraw) + boostingFund) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);
      expect(winner).to.equal(winnerEvent[0]);
      expect(expectedBalanceEachDraw).to.equal(balanceEachDraw);
      // No winner is expected for each cycle
      expect(winner).to.equal(testHelper.ADDRESS_0);
      expect(prize).to.equal(winnerEvent[1]);
      // Brought forward amount updated to new prize
      expect(prize).to.equal(await prizeLinkedAccountVault.getAmountBroughtToNextDraw());
    }

    const expectedBroughtForwardAfter14Cycles = BigInt(14) * (BigInt(expectedBalanceEachDraw) + boostingFund) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);
    expect(expectedBroughtForwardAfter14Cycles).to.equal(await prizeLinkedAccountVault.getAmountBroughtToNextDraw());
  });

  it('verify brought balance will be used if no winner for multiple cycles - different deposits every draw', async function () {
    const boostingFund = depositAmount * BigInt(7);
    await gluwaCoin.mint(user3.address, boostingFund);
    await gluwaCoin.connect(user3).approve(prizeLinkedAccountVault.address, boostingFund);
    await prizeLinkedAccountVault.addBoostingFund(user3.address, boostingFund);
    var depositEachDraw = 0;
    var previousPrize = BigInt(0);
    for (var j = 14; j > 0; j--) {
      var depositTime = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY * j;
      var drawDate = BigInt(0);
      depositEachDraw++;
      // For each draw the number of deposit will increase by 1
      for (var i = 1; i <= depositEachDraw; i++) {
        var temp = await ethers.Wallet.createRandom();
        await gluwaCoin.mint(temp.address, mintAmount);
        await bank2.sendTransaction({
          to: temp.address,
          value: ethers.utils.parseEther("1")
        });
        var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
        await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
        var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime, temp.address);
        var receipt = await accountTxn.wait();

        var ticketEvent = receipt.events.filter(function (one) {
          return one.event == "TicketCreated";
        })[0].args;

        drawDate = ticketEvent[0];
      }
      // the ticket value to ensure no winner
      var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_Dummy(drawDate, 999999999999999);

      var receipt = await makeDrawV1Txn.wait();
      await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate, receipt.events[0].args['winningTicket'], 999999999999999, 999999999999999);
      var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

      expect(previousPrize).to.equal(await prizeLinkedAccountVault.getAmountBroughtToNextDraw());

      var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
      var winnerTxn = await prizeLinkedAccountVault.awardWinnerV1(drawDate);

      // regenerate tickets for next draw
      var nextDraw = drawDate.toBigInt() + BigInt(testHelper.TOTAL_SECONDS_PER_DAY);
      await prizeLinkedAccountVault.regenerateTicketForNextDraw(nextDraw);

      var receiptWinner = await winnerTxn.wait();
      var winnerEvent = receiptWinner.events.filter(function (one) {
        return one.event == "WinnerSelected";
      })[0].args;

      var numberOfAccumulatedDeposit = BigInt((depositEachDraw + 1) * depositEachDraw / 2);
      var expectedBalanceEachDraw = numberOfAccumulatedDeposit * BigInt(depositAmount);
      var prize = previousPrize + (expectedBalanceEachDraw + boostingFund) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);

      expect(winner).to.equal(winnerEvent[0]);
      expect(expectedBalanceEachDraw).to.equal(balanceEachDraw);
      // No winner is expected for each cycle
      expect(winner).to.equal(testHelper.ADDRESS_0);
      expect(prize).to.equal(winnerEvent[1]);
      // Brought forward amount updated to new prize
      expect(prize).to.equal(await prizeLinkedAccountVault.getAmountBroughtToNextDraw());
      previousPrize = prize;
    }
  });

  it('verify brought balance will be used for the next draw', async function () {
    var setPrizeLinkedAccountSettingsTxn = await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      0,
      1,
      testHelper.lowerLimitPercentage
    );
    var receipt = await setPrizeLinkedAccountSettingsTxn.wait();
    expect(receipt.events.length).to.equal(2);
    await expect(setPrizeLinkedAccountSettingsTxn).to.emit(prizeLinkedAccountVault, "AccountSavinSettingsUpdated").withArgs(
      owner.address,
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      receipt.events[0].args['budget'],
      1,
      1
    );
    expect(BigInt(receipt.events[0].args['budget'])).to.equal(testHelper.budget);
    await expect(setPrizeLinkedAccountSettingsTxn).to.emit(prizeLinkedAccountVault, "GluwaPrizeDrawSettingsUpdated").withArgs(
      owner.address,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      0,
      1,
      receipt.events[1].args['lowerLimitPercentage']
    );
    expect(BigInt(receipt.events[1].args['lowerLimitPercentage'])).to.equal(testHelper.lowerLimitPercentage);

    var drawDate1 = BigInt(0);
    var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
    for (var i = 0; i < 10; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank2.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime1, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
      })[0].args;

      drawDate1 = ticketEvent[0];
    }
    var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_Dummy(drawDate1, 999999999999999);

    var receipt = await makeDrawV1Txn.wait();
    expect(receipt.events.length).to.equal(1);


    await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate1, receipt.events[0].args['winningTicket'], 999999999999999, 999999999999999);

    var { 0: owners1, 1: tickets1, 2: winningTicket1, 3: balanceEachDraw1 } = await prizeLinkedAccountVault.getDrawDetails(drawDate1);

    var winner1 = await prizeLinkedAccountVault.getDrawWinner(drawDate1);

    var winnerTxn1 = await prizeLinkedAccountVault.awardWinnerV1(drawDate1);
    var receiptWinner1 = await winnerTxn1.wait();
    var winnerEvent1 = receiptWinner1.events.filter(function (one) {
      return one.event == "WinnerSelected";
    })[0].args;
    var earnt1 = BigInt(balanceEachDraw1) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);
    expect(winner1).to.equal(winnerEvent1[0]);
    expect(earnt1).to.equal(winnerEvent1[1]);
    expect(earnt1).to.equal(await prizeLinkedAccountVault.getAmountBroughtToNextDraw());

    var drawDate2 = BigInt(0);
    var depositTime2 = (Date.now() / 1000) | 0;
    for (var i = 0; i < 15; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank2.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime2, temp.address);
      var receipt = await accountTxn.wait();

      var ticketEvent = receipt.events.filter(function (one) {
        return one.event == "TicketCreated";
      })[0].args;

      drawDate2 = ticketEvent[0];
    }


    const randomMax = 99999999;
    const randomMin = 10000000;
    var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_NoValidation(drawDate2, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));

    var receipt = await makeDrawV1Txn.wait();
    expect(receipt.events.length).to.equal(1);
    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate2);

    await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate2, receipt.events[0].args['winningTicket'], min, max);

    var { 0: owners, 1: tickets, 2: winningTicket2, 3: balanceEachDraw2 } = await prizeLinkedAccountVault.getDrawDetails(drawDate2);

    var winner2 = await prizeLinkedAccountVault.getDrawWinner(drawDate2);
    const { 0: savingAccount_idx,
      1: savingAccount_hash,
      2: savingAccount_owner,
      3: savingAccount_creationDate,
      4: savingAccount_balance,
      5: savingAccount_earning,
      6: savingAccount_state,
      7: savingAccount_securityReferenceHash } = (await prizeLinkedAccountVault.getSavingAcountFor(winner2));

    var winnerTxn2 = await prizeLinkedAccountVault.awardWinnerV1(drawDate2);
    var receiptWinner2 = await winnerTxn2.wait();
    var winnerEvent2 = receiptWinner2.events.filter(function (one) {
      return one.event == "WinnerSelected";
    })[0].args;
    var earnt2 = (BigInt(balanceEachDraw2) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase)) + earnt1;

    expect(winner2).to.equal(winnerEvent2[0]);
    expect(earnt2).to.equal(winnerEvent2[1]);

    const { 0: savingAccount_idx1,
      1: savingAccount_hash1,
      2: savingAccount_owner1,
      3: savingAccount_creationDate1,
      4: savingAccount_balance1,
      5: savingAccount_earning1,
      6: savingAccount_state1,
      7: savingAccount_securityReferenceHash1 } = (await prizeLinkedAccountVault.getSavingAcountFor(winner2));

    var totalAfterWinning = BigInt(savingAccount_balance) + earnt2;
    expect(totalAfterWinning).to.equal(savingAccount_balance1);


  });


  it('verify the boosting fund will increase the prize pool size', async function () {
    await gluwaCoin.mint(user3.address, mintAmount);
    await gluwaCoin.connect(user3).approve(prizeLinkedAccountVault.address, depositAmount * BigInt(7));

    var boostingFund = depositAmount * BigInt(7);

    var addBoostingFundTxn = await prizeLinkedAccountVault.addBoostingFund(user3.address, boostingFund);

    var receipt = await addBoostingFundTxn.wait();
    expect(receipt.events.length).to.equal(4);
    await expect(addBoostingFundTxn).to.emit(prizeLinkedAccountVault, "TopUpBalance").withArgs(user3.address, boostingFund);


    //reduce the gap to ensure there is always a winner
    var setPrizeLinkedAccountSettingsTxn = await prizeLinkedAccountVault.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      testHelper.winningChanceFactor,
      1,
      testHelper.lowerLimitPercentage
    );
    var receipt = await setPrizeLinkedAccountSettingsTxn.wait();
    expect(receipt.events.length).to.equal(2);
    await expect(setPrizeLinkedAccountSettingsTxn).to.emit(prizeLinkedAccountVault, "AccountSavinSettingsUpdated").withArgs(
      owner.address,
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      receipt.events[0].args['budget'],
      1,
      1
    );
    expect(BigInt(receipt.events[0].args['budget'])).to.equal(testHelper.budget);
    await expect(setPrizeLinkedAccountSettingsTxn).to.emit(prizeLinkedAccountVault, "GluwaPrizeDrawSettingsUpdated").withArgs(
      owner.address,
      testHelper.cutOffHour,
      testHelper.cutOffMinute,
      testHelper.processingCap,
      testHelper.winningChanceFactor,
      1,
      receipt.events[1].args['lowerLimitPercentage']
    );
    expect(BigInt(receipt.events[1].args['lowerLimitPercentage'])).to.equal(testHelper.lowerLimitPercentage);

    var drawDate = BigInt(0);
    var depositTime = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
    var totalFund = boostingFund;
    for (var i = 0; i < 10; i++) {
      var temp = await ethers.Wallet.createRandom();
      await gluwaCoin.mint(temp.address, mintAmount);
      await bank2.sendTransaction({
        to: temp.address,
        value: ethers.utils.parseEther("1")
      });
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
      var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime, temp.address);
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

      totalFund += depositAmount;
    }
    const randomMax = 99999999;
    const randomMin = 10000000;
    var makeDrawV1Txn = await prizeLinkedAccountVault.makeDrawV1_NoValidation(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));

    var receipt = await makeDrawV1Txn.wait();
    expect(receipt.events.length).to.equal(1);
    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);

    await expect(makeDrawV1Txn).to.emit(prizeLinkedAccountVault, "DrawResult").withArgs(drawDate, receipt.events[0].args['winningTicket'], min, max);

    var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
    var winnerTxn = await prizeLinkedAccountVault.awardWinnerV1(drawDate);
    var receiptWinner = await winnerTxn.wait();
    var winnerEvent = receiptWinner.events.filter(function (one) {
      return one.event == "WinnerSelected";
    })[0].args;
    expect(BigInt(balanceEachDraw) + boostingFund).to.equal(totalFund);

    var earnt = BigInt(totalFund) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);
    expect(winner).to.equal(winnerEvent[0]);
    expect(earnt).to.equal(winnerEvent[1]);
  });
});
