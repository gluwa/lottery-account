const { ContractFactory } = require('@ethersproject/contracts');
const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./sharedLuniverse');
var chai = require('chai');
chai.use(require('chai-bignumber')());
use(solidity);

const name = 'Gluwacoin';
const symbol = 'Gluwacoin';
const decimals = 18;
const lowerLimitPercentage = 30; 
const standardInterestRate = 15;
const standardInterestRatePercentageBase = 100;
const cutOffHour = 16;
const cutOffMinute = 59;
const ticketRangeFactor = 100;
const decimalsVal = BigInt(10) ** BigInt(decimals);
const budget = BigInt(20000000000) * decimalsVal;

var ownerAddress;
var owner;
var user1;
var bank1;
var bank2;
var gluwaCoinAddress;
var large_mintAmount = BigInt(2000000000) * decimalsVal;
var large_depositBaseAmount = BigInt(700000);
var depositAmount = large_depositBaseAmount * decimalsVal;
var large_depositAmount = large_depositBaseAmount * decimalsVal * BigInt(10);
var targetAccountCreated = 3;
//var targetAccountCreated = 3000; //Tested
var ticketPerToken = 1;
var prizeLinkedAccountVault;
var processingCap = 272;
var gluwaCoin;
var gluwaCoin2;
var provider;
var abi;
var iface;
var abi2;
var iface2;
var LuniverseInstance;

// Start test block
if(testHelper.LuniversetestActivate)
describe('Boundary test for drawing and ticket issuance', function () {
  before(async function () {
    this.GluwaAccountModel = await ethers.getContractFactory("GluwaAccountModel");
    this.DateTimeModel = await ethers.getContractFactory("DateTimeModel");
    var GluwaAccountModel = await this.GluwaAccountModel.deploy();
    var DateTimeModel = await this.DateTimeModel.deploy();
    await DateTimeModel.deployed();
    await GluwaAccountModel.deployed();
    LuniverseInstance = await testHelper.LuniverseContractInstancelize();
    gluwaCoin = LuniverseInstance.gluwaCoin;
    prizeLinkedAccountVault = LuniverseInstance.prizeLinkedAccountVault;
    provider = LuniverseInstance.provider;
    owner = LuniverseInstance.owner; 
    user1 = await ethers.Wallet.createRandom();
    bank1 = await ethers.Wallet.createRandom();
    bank2 = await ethers.Wallet.createRandom();
    ownerAddress = owner.address;
  });

  beforeEach(async function () {
    owner = LuniverseInstance.owner; 
    abi = [ "event TicketCreated(uint256 indexed drawTimeStamp, uint256 indexed ticketId, address indexed owner, uint256 upper, uint256 lower)" ];
    iface = new ethers.utils.Interface(abi);
    abi2 = [ "event WinnerSelected(address winner, uint256 reward)" ];
    iface2 = new ethers.utils.Interface(abi2);

    input = await gluwaCoin.populateTransaction.mint(user1.address, large_mintAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.connect(user1).populateTransaction.approve(prizeLinkedAccountVault.address, large_mintAmount);
    await testHelper.submitRawTxn(input, user1, ethers, provider);
  });

  it('create prize-linked account with many tickets', async function () {
    owner = LuniverseInstance.owner; 
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, large_depositAmount, user1.address);

    var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
    var event;
    for(var i=0;i<receipt.logs.length; i++){
      try{
        event = iface.parseLog(receipt.logs[i]);
      }catch(err){}
    }    

    var drawDate = event.args[0];
    var ticketId = event.args[1];
    var owner = event.args[2];
    var lower = event.args[3];
    var upper = event.args[4];

    const { 0: ticket_idx,
      1: ticket_owner,
      2: ticket_lower,
      3: ticket_upper } = (await prizeLinkedAccountVault.getTicketRangeById(ticketId));

    expect(upper).to.equal(ticket_upper);
    expect(lower).to.equal(ticket_lower);
    expect(owner).to.equal(ticket_owner);
    expect(owner).to.equal(user1.address);

    expect(testHelper.getTimeFromTimestamp(drawDate)).to.equal("12:00:00");   
    var range = BigInt(upper) - BigInt(lower) + BigInt(1);
    expect(range).to.equal((large_depositAmount / decimalsVal));

  });

  it('create multiple prize-linked accounts with many tickets', async function () {
    owner = LuniverseInstance.owner; 
     
    var balance = await gluwaCoin.balanceOf(prizeLinkedAccountVault.address);
    for (var i = 0; i < targetAccountCreated; i++) {
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, large_mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);

      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var event;
      for(var i=0;i<receipt.logs.length; i++){
        try{
          event = iface.parseLog(receipt.logs[i]);
        }catch(err){}
      }    
      var drawDate = event.args[0];
      var ticketId = event.args[1];
      var owner = event.args[2];
      var lower = event.args[3];
      var upper = event.args[4];

      range = upper.toBigInt() - lower.toBigInt() + BigInt(1);
      expect(range).to.equal(BigInt(depositAmount / decimalsVal));
      expect(owner).to.equal(temp.address);
      expect(testHelper.getTimeFromTimestamp(drawDate)).to.equal("12:00:00");
      expect((await gluwaCoin.balanceOf(prizeLinkedAccountVault.address))).to.equal(BigInt(balance) + BigInt(depositAmount));

    }

  });

  it('do drawing with large number of participant', async function () {

    owner = LuniverseInstance.owner; 
    let abi = [ "event TicketCreated(uint256 indexed drawTimeStamp, uint256 indexed ticketId, address indexed owner, uint256 upper, uint256 lower)" ];
    let iface = new ethers.utils.Interface(abi);

    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < targetAccountCreated; i++) {
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, large_mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);
      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      
      var event;
      for(var i=0;i<receipt.logs.length; i++){
        try{
          event = iface.parseLog(receipt.logs[i]);
        }catch(err){}
      }    
      var drawDateTemp = event.args[0];

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
    input = await prizeLinkedAccountVault.populateTransaction.makeDrawV1(drawDate,Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
    var { 0: owners, 1: tickets, 2: winningTicket, 3: balanceEachDraw } = await prizeLinkedAccountVault.getDrawDetails(drawDate);
    expect(totalInDraw).to.below(owners.length);
    expect(totalInDraw).to.below(tickets.length);

  });

  it('do drawing and award winner with large number of participant', async function () {
    owner = LuniverseInstance.owner; 

    var totalInDraw = 0;
    var drawDate = BigInt(0);
    for (var i = 0; i < targetAccountCreated; i++) {
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, depositAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](temp.address, depositAmount, temp.address);
      var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var event;
      for(var i=0;i<receipt.logs.length; i++){
        try{
          event = iface.parseLog(receipt.logs[i]);
        }catch(err){}
      }    
      var drawDateTemp = event.args[0];
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

    input = await prizeLinkedAccountVault.populateTransaction.makeDrawV1(drawDate,Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
    input = await prizeLinkedAccountVault.populateTransaction.awardWinnerV1(drawDate);
    var receiptWinner = await testHelper.submitRawTxn(input,owner, ethers, provider);
    var winnerEvent;
    for(var i=0;i<receiptWinner.logs.length; i++){
      try{
        winnerEvent = iface2.parseLog(receiptWinner.logs[i]);
      }catch(err){}
    }
    expect(await prizeLinkedAccountVault.getDrawWinner(drawDate)).to.equal(winnerEvent.args[0]);
  });


});



