const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./sharedLuniverse');
var chai = require('chai');
chai.should();
chai.use(require('chai-bignumber')());
use(solidity);
const decimals = 18;
const lowerLimitPercentage = BigInt(30);
const standardInterestRate = 15;
const standardInterestRatePercentageBase = 100;
const cutOffHour = 16;
const cutOffMinute = 59;
const ticketRangeFactor = 100;
const decimalsVal = BigInt(10) ** BigInt(decimals);
const budget = BigInt(20000000000) * decimalsVal;
const ticketPerToken = 1;
const processingCap = 110;

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
let abi;
let iface;
let abi2;
let iface2;



if(testHelper.LuniversetestActivate)
// Start test block
describe('Prize Draw', function () {
  before(async function () {
    this.GluwaAccountModel = await ethers.getContractFactory("GluwaAccountModel");
    this.DateTimeModel = await ethers.getContractFactory("DateTimeModel");
    var GluwaAccountModel = await this.GluwaAccountModel.deploy();
    var DateTimeModel = await this.DateTimeModel.deploy();
    await DateTimeModel.deployed();
    await GluwaAccountModel.deployed();
    gluwaCoin = (await testHelper.LuniverseContractInstancelize()).gluwaCoin;
    prizeLinkedAccountVault = (await testHelper.LuniverseContractInstancelize()).prizeLinkedAccountVault;
    provider = (await testHelper.LuniverseContractInstancelize()).provider;
    owner = (await testHelper.LuniverseContractInstancelize()).owner; 
    user1 = await ethers.Wallet.createRandom();
    bank1 = await ethers.Wallet.createRandom();
    bank2 = await ethers.Wallet.createRandom();
    ownerAddress = owner.address;
  });

  beforeEach(async function () {
    owner = (await testHelper.LuniverseContractInstancelize()).owner; 
    abi = [ "event TicketCreated(uint256 indexed drawTimeStamp, uint256 indexed ticketId, address indexed owner, uint256 upper, uint256 lower)" ];
    iface = new ethers.utils.Interface(abi);
    abi2 = [ "event WinnerSelected(address winner, uint256 reward)" ];
    iface2 = new ethers.utils.Interface(abi2);


    input = await gluwaCoin.populateTransaction.mint(user1.address, mintAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.connect(user1).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
    await testHelper.submitRawTxn(input, user1, ethers, provider);
  });

  it('check ticket allocation and participants', async function () {
    owner = (await testHelper.LuniverseContractInstancelize()).owner; 

    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < 3; i++) {
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);
  
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);
      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      expect(receipt.status).to.equal(1);
      var ticketEvent;
        for(var i=0;i<receipt.logs.length; i++){
          try{
            ticketEvent = iface.parseLog(receipt.logs[i]);
          }catch(err){}
        }    

      var drawDateTemp = ticketEvent.args[0];

      if (drawDate == BigInt(0)) {
        drawDate = drawDateTemp;
      }
      else if (drawDate < drawDateTemp) {
        break;
      }
      totalInDraw++;
    }
    
    var { 0: owners, 1: tickets } = await prizeLinkedAccountVault.getDrawDetails(drawDate);

    expect(totalInDraw).to.above(0);
    expect(totalInDraw).to.above(0);
  });


  it('check max min for a draw', async function () {

    var totalInDraw = 0;
    var drawDate = BigInt(0);
    var lower = BigInt(0);
    var upper = BigInt(0);
    for (var i = 0; i < 3; i++) {
      var temp = await ethers.Wallet.createRandom();
        input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);  
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);

      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var ticketEvent;
        for(var i=0;i<receipt.logs.length; i++){
          try{
            ticketEvent = iface.parseLog(receipt.logs[i]);
          }catch(err){}
        }    

      // console.log(ticketEvent);
      var drawDateTemp = ticketEvent.args[0];

      if (drawDate == BigInt(0)) {
        drawDate = drawDateTemp;
        lower = ticketEvent.args[3];
      }
      else if (drawDate < drawDateTemp) {
        break;
      }
      upper = ticketEvent.args[4];

    }
    var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
    // expect(upper).to.equal(max);
    // expect(lower).to.equal(min);

  });

  it('check if each participant having valid tickets', async function () {

    var drawDate = BigInt(0);
    for (var i = 0; i < 2; i++) {
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);  
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);
      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var ticketEvent;
        for(var i=0;i<receipt.logs.length; i++){
          try{
            ticketEvent = iface.parseLog(receipt.logs[i]);
          }catch(err){}
        }    

      var drawDateTemp = ticketEvent.args[0];

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

  it('verify winner account after drawing', async function () {
    owner = (await testHelper.LuniverseContractInstancelize()).owner; 

    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < 2; i++) {
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);  
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);

      // input = await prizeLinkedAccountVault.populateTransaction.createPrizedLinkAccount(temp.address, depositAmount, temp.address);
      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var ticketEvent;
        for(var i=0;i<receipt.logs.length; i++){
          try{
            ticketEvent = iface.parseLog(receipt.logs[i]);
          }catch(err){}
        }    

      var drawDateTemp = ticketEvent.args[0];

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
    input = await prizeLinkedAccountVault.populateTransaction.makeDrawV1(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    await testHelper.submitRawTxn(input,owner, ethers, provider); 
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

    input = await prizeLinkedAccountVault.populateTransaction.awardWinnerV1(drawDate);
    receiptWinner = await testHelper.submitRawTxn(input,owner, ethers, provider); 
    // console.log(receiptWinner)
    var winnerEvent;
    for(var i=0;i<receiptWinner.logs.length; i++){
      try{
        winnerEvent = iface2.parseLog(receiptWinner.logs[i]);
      }catch(err){}
    }    
    var earnt = BigInt(balanceEachDraw) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);
    const { 0: savingAccount_idx1,
      1: savingAccount_hash1,
      2: savingAccount_owner1,
      3: savingAccount_creationDate1,
      4: savingAccount_balance1,
      5: savingAccount_earning1,
      6: savingAccount_state1,
      7: savingAccount_securityReferenceHash1 } = (await prizeLinkedAccountVault.getSavingAcountFor(winner));


    expect(winner).to.equal(winnerEvent.args[0]);

  });

  it('verify brought balance if there is no winner', async function () {
    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < 3; i++) {
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);  
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);
      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var ticketEvent;
        for(var i=0;i<receipt.logs.length; i++){
          try{
            ticketEvent = iface.parseLog(receipt.logs[i]);
          }catch(err){}
        }    

      var drawDateTemp = ticketEvent.args[0];


      if (drawDate == BigInt(0)) {
        drawDate = drawDateTemp;
      }
      else if (drawDate < drawDateTemp) {
        break;
      }
      totalInDraw++;
    }
    input = await prizeLinkedAccountVault.populateTransaction.makeDrawV1(drawDate,999999999999999);
    var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
    var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);
    var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
    input = await prizeLinkedAccountVault.populateTransaction.awardWinnerV1(drawDate);
    var receiptWinner = await testHelper.submitRawTxn(input,owner, ethers, provider);

    var winnerEvent;
    for(var i=0;i<receiptWinner.logs.length; i++){
      try{
        winnerEvent = iface2.parseLog(receiptWinner.logs[i]);
      }catch(err){}
    }    
    var earnt = BigInt(balanceEachDraw) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);

    expect(winner).to.equal(winnerEvent.args[0]);
    // expect(earnt).to.equal(winnerEvent.args[1]); //we may call awardWinner multti times in this test

  });

  it('verify brought balance will be used for the next draw', async function () {

    input = await prizeLinkedAccountVault.populateTransaction.setPrizeLinkedAccountSettings(
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
    await testHelper.submitRawTxn(input,owner, ethers, provider);

    var drawDate1 = BigInt(0);
    var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
    for (var i = 0; i < 3; i++) {
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);  
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);
      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var ticketEvent;
        for(var i=0;i<receipt.logs.length; i++){
          try{
            ticketEvent = iface.parseLog(receipt.logs[i]).args;
          }catch(err){}
        }    
      drawDate1 = ticketEvent[0];
    }
    input = await prizeLinkedAccountVault.populateTransaction.makeDrawV1(drawDate1, 999999999999999);
    res = await testHelper.submitRawTxn(input, owner, ethers, provider);
    var { 0: owners1, 1: tickets1, 2: winningTicket1, 3: balanceEachDraw1 } = await prizeLinkedAccountVault.getDrawDetails(drawDate1);

    var winner1 = await prizeLinkedAccountVault.getDrawWinner(drawDate1);
    input = await prizeLinkedAccountVault.populateTransaction.awardWinnerV1(drawDate1);
    var winnerTxn1 = await testHelper.submitRawTxn(input,owner, ethers, provider);
    var winnerEvent1;
    for(var i=0;i<winnerTxn1.logs.length; i++){
      try{
        winnerEvent1 = iface2.parseLog(winnerTxn1.logs[i]).args;
      }catch(err){}
    }    
    var earnt1 = BigInt(balanceEachDraw1) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);
    expect(winner1).to.equal(winnerEvent1[0]);
    // expect(earnt1).to.equal(winnerEvent1[1]);
    // expect(earnt1).to.equal(await prizeLinkedAccountVault.getAmountBroughtToNextDraw());

    var depositTime2 = (Date.now() / 1000) | 0;
    for (var i = 0; i < 3; i++) {      
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);  
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);
      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var ticketEvent;
      for(var i=0;i<receipt.logs.length; i++){
        try{
          ticketEvent = iface.parseLog(receipt.logs[i]).args;
        }catch(err){}
      }    

      drawDate2 = ticketEvent[0];
    }

    const randomMax = 99999999;
    const randomMin = 10000000;
    input = await prizeLinkedAccountVault.populateTransaction.makeDrawV1(drawDate2, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
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

    input = await prizeLinkedAccountVault.populateTransaction.awardWinnerV1(drawDate2);
    var receiptWinner2 = await testHelper.submitRawTxn(input,owner, ethers, provider);
    var winnerEvent2;
    for(var i=0;i<receiptWinner2.logs.length; i++){
      try{
        winnerEvent2 = iface2.parseLog(receiptWinner2.logs[i]).args;
      }catch(err){}
    }    
    var earnt2 = (earnt1 + BigInt(balanceEachDraw2)) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);

    expect(winner2).to.equal(winnerEvent2[0]);
    // expect(earnt2).to.equal(winnerEvent2[1]);

  });

  it('verify the boosting fund will increase the prize pool size', async function () {
    user3 = await ethers.Wallet.createRandom();
    input = await gluwaCoin.populateTransaction.mint(user3.address, mintAmount);
    await testHelper.submitRawTxn(input,owner, ethers, provider);
    input = await gluwaCoin.connect(user3).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount * BigInt(7));
    await testHelper.submitRawTxn(input,user3, ethers, provider);
    var boostingFund = depositAmount * BigInt(7);

    input = await prizeLinkedAccountVault.populateTransaction.addBoostingFund(user3.address, boostingFund);
    res = await testHelper.submitRawTxn(input,owner, ethers, provider);

    //reduce the gap to ensure there is always a winner
    input = await prizeLinkedAccountVault.populateTransaction.setPrizeLinkedAccountSettings(
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
    res=await testHelper.submitRawTxn(input,owner, ethers, provider);
    var drawDate = BigInt(0);
    var depositTime = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
    var totalFund = boostingFund;
    var depositTime = BigInt(0);
    for (var i = 0; i < 3; i++) {
      var temp = await ethers.Wallet.createRandom();  
      input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);  
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);
      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var ticketEvent;
      for(var i=0;i<receipt.logs.length; i++){
        try{
          ticketEvent = iface.parseLog(receipt.logs[i]).args;
        }catch(err){}
      }    

      var drawDateTemp = ticketEvent[0];


      if (drawDate == BigInt(0)) {
        drawDate = drawDateTemp;
      }
      else if (drawDate < drawDateTemp) {
        break;
      }
      depositTime += BigInt(1);
      totalFund += depositAmount;
    }
    const randomMax = 99999999;
    const randomMin = 10000000;
    input = await prizeLinkedAccountVault.populateTransaction.makeDrawV1(drawDate, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    await testHelper.submitRawTxn(input,owner, ethers, provider);


    var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);
    var winner = await prizeLinkedAccountVault.getDrawWinner(drawDate);
    input = await prizeLinkedAccountVault.populateTransaction.awardWinnerV1(drawDate);
    var winnerTxn = await testHelper.submitRawTxn(input,owner, ethers, provider);

    var winnerEvent;
    for(var i=0;i<winnerTxn.logs.length; i++){
      try{
        winnerEvent = iface2.parseLog(winnerTxn.logs[i]).args;
      }catch(err){}
    }      
    expect(winner).to.equal(winnerEvent[0]);
    expect(boostingFund + depositAmount * depositTime == totalFund).to.equal(true);
  });
});