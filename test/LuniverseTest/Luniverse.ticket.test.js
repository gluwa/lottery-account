const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./sharedLuniverse');
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
var abi;
var iface;
var abi2;
var iface2;
var LuniverseInstance;
if(testHelper.LuniversetestActivate)
// Start test block
describe('Ticket Reissuance', function () {

  before(async function () {
    LuniverseInstance = await testHelper.LuniverseContractInstancelize();
    gluwaCoin = LuniverseInstance.gluwaCoin;
    prizeLinkedAccountVault = LuniverseInstance.prizeLinkedAccountVault;
    provider = LuniverseInstance.provider;
    
  });

  beforeEach(async function () {
    owner = LuniverseInstance.owner; 
    user1 = await ethers.Wallet.createRandom();
    user2 = await ethers.Wallet.createRandom();
    user3 = await ethers.Wallet.createRandom();
    lender = await ethers.Wallet.createRandom();
    ownerAddress = owner.address;
    abi = [ "event TicketCreated(uint256 indexed drawTimeStamp, uint256 indexed ticketId, address indexed owner, uint256 upper, uint256 lower)" ];
    iface = new ethers.utils.Interface(abi);
    abi2 = [ "event WinnerSelected(address winner, uint256 reward)" ];
    iface2 = new ethers.utils.Interface(abi2);

    input = await gluwaCoin.populateTransaction.mint(user1.address, mintAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.connect(user1).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
    await testHelper.submitRawTxn(input, user1, ethers, provider);
  });


  it('verify ticket reissuance for next draw', async function () {
    const processingCap = 7;
    const randomMax = 99999999;
    const randomMin = 10000000;
    input = await prizeLinkedAccountVault.populateTransaction.setPrizeLinkedAccountSettings(
      testHelper.standardInterestRate,
      testHelper.standardInterestRatePercentageBase,
      testHelper.budget,
      1,
      1,
      0,
      0,
      processingCap,
      0,
      1,
      testHelper.lowerLimitPercentage
    );
    await testHelper.submitRawTxn(input, owner, ethers, provider);  

    var drawDate1 = BigInt(0);
    var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
    var totalInDraw1 = 0;
    var drawDate2 = BigInt(0);
    var totalInDraw2 = 0;
    var depositTime2 = (Date.now() / 1000) | 0;
    drawTime1 = await prizeLinkedAccountVault._calculateDrawTime(depositTime1);
    drawTime2 = await prizeLinkedAccountVault._calculateDrawTime(depositTime2);
    input = await prizeLinkedAccountVault.populateTransaction.regenerateTicketForNextDraw(drawTime2);
    res = await testHelper.submitRawTxn(input, owner, ethers, provider);

    initalEligibleArr = await prizeLinkedAccountVault.getEligibleAddressPendingAddedToDraw(drawTime2);
    var currDraw2=(await prizeLinkedAccountVault.getEligibleAddressPendingAddedToDraw(drawTime2)).length;
    var { 0: owners, 1: tickets, 2: winningTicket2, 3: currBalanceEachDraw2 } = await prizeLinkedAccountVault.getDrawDetails(drawTime2);

    for (var i = 0; i < 4; i++) {
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);  
      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,uint256,bytes)'](temp.address,depositAmount, depositTime1, temp.address);
      receipt = await testHelper.submitRawTxn(input, owner, ethers, provider);
      var ticketEvent;
      for(var j=0;j<receipt.logs.length; j++){
        try{
          ticketEvent = iface.parseLog(receipt.logs[j]).args;
        }catch(err){}
      }    
      var drawDateTemp = ticketEvent[0];
      if (drawDate1 == BigInt(0)) {
        drawDate1 = drawDateTemp;
      }
      else if (drawDate1 < drawDateTemp) {
        break;
      }
      totalInDraw1++;
    }
    input = await prizeLinkedAccountVault.populateTransaction.makeDrawV1(drawTime1, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    res = await testHelper.submitRawTxn(input, owner, ethers, provider);
   
    winner1 = await prizeLinkedAccountVault.getDrawWinner(drawTime1);
    input = await prizeLinkedAccountVault.populateTransaction.awardWinnerV1(drawTime1);
    var receiptWinner = await testHelper.submitRawTxn(input,owner, ethers, provider);    
    var { 0: owners1, 1: tickets1, 2: winningTicket1, 3: balanceEachDraw1 } = await prizeLinkedAccountVault.getDrawDetails(drawDate1);
    
    input = await prizeLinkedAccountVault.populateTransaction.awardWinnerV1(drawDate1);
    var receiptWinner = await testHelper.submitRawTxn(input,owner, ethers, provider);    

    var winnerEvent1;
    for(var j=0;j<receiptWinner.logs.length; j++){
      try{
        winnerEvent1 = iface2.parseLog(receiptWinner.logs[j]).args;
      }catch(err){}
    }    

    var earnt1 = BigInt(balanceEachDraw1) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);
    expect(winner1).to.equal(winnerEvent1[0]);
    
    var totalPool1 = depositAmount * BigInt(totalInDraw1) + earnt1;
    
    for (var i = 0; i < 4; i++) {
      console.log(i)
      var temp = await ethers.Wallet.createRandom();
      input = await gluwaCoin.populateTransaction.mint(temp.address, mintAmount);
      await testHelper.submitRawTxn(input, owner, ethers, provider);  

      var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
      await testHelper.submitRawTxn(drawTxn, temp, ethers, provider);
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,uint256,bytes)'](temp.address,depositAmount, depositTime2, temp.address);
      receipt = await testHelper.submitRawTxn(input, owner, ethers, provider);
      var ticketEvent;
      for(var j=0;j<receipt.logs.length; j++){
        try{
          ticketEvent = iface.parseLog(receipt.logs[j]).args;
        }catch(err){}
      }    
      var drawDateTemp = ticketEvent[0];
      if (drawDate2 == BigInt(0)) {
        drawDate2 = drawDateTemp;
      }
      else if (drawDate2 < drawDateTemp) {
        break;
      }
      totalInDraw2++;
    }

    var winnerNum1 = winner1 == "0x0000000000000000000000000000000000000000" ?0:1; 
    //The total pending will exlude the winner
    input = await prizeLinkedAccountVault.populateTransaction.regenerateTicketForNextDraw(drawDate2);
    res = await testHelper.submitRawTxn(input, owner, ethers, provider);

    input = await prizeLinkedAccountVault.populateTransaction.makeDrawV1(drawDate2, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));
    var receiptWinner2 = await testHelper.submitRawTxn(input,owner, ethers, provider);
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
    for(var j=0;j<receiptWinner2.logs.length; j++){
      try{
        winnerEvent2 = iface2.parseLog(receiptWinner2.logs[j]).args;
      }catch(err){}
    }    
    var earnt2 = BigInt(balanceEachDraw2) * BigInt(testHelper.standardInterestRate) / BigInt(testHelper.standardInterestRatePercentageBase);    
    expect(winner2).to.equal(winnerEvent2[0]);
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
});
