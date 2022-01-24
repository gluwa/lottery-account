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
    var winningticket = await prizeLinkedAccountVault.callStatic.makeDrawV1(drawDate, 0);

    expect(max - winningticket).to.be.greaterThanOrEqual(0);
    expect(winningticket - min).to.be.greaterThanOrEqual(0);
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
    var winningticket = await prizeLinkedAccountVault.callStatic.makeDrawV1(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));

    expect(max - winningticket).to.be.greaterThanOrEqual(0);
    expect(winningticket - min).to.be.greaterThanOrEqual(0);


  });

  it('verify winner account after drawing', async function () {
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
    await prizeLinkedAccountVault.makeDrawV1(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));

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
    await prizeLinkedAccountVault.makeDrawV1_Dummy(drawDate, 999999999999999);

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

  it('verify brought balance will be used for the next draw', async function () {

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
    await prizeLinkedAccountVault.makeDrawV1_Dummy(drawDate1, 999999999999999);

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
    console.info(await prizeLinkedAccountVault.getAmountBroughtToNextDraw());

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
    await prizeLinkedAccountVault.makeDrawV1(drawDate2, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));

    var { 0: owners, 1: tickets, 2: winningTicket2, 3: balanceEachDraw2 } = await prizeLinkedAccountVault.getDrawDetails(drawDate2);


    var winner2 = await prizeLinkedAccountVault.getDrawWinner(drawDate2);
    console.info("drawDate2 " + drawDate2);

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
    var earnt2 = (earnt1 + BigInt(balanceEachDraw2)) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);

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

    await prizeLinkedAccountVault.addBoostingFund(user3.address, boostingFund);

    //reduce the gap to ensure there is always a winner
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
    await prizeLinkedAccountVault.makeDrawV1(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));


    var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
    console.info("drawDate " + drawDate);

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