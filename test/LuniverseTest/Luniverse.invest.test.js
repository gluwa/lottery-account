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
let abi;
let iface;


if(testHelper.LuniversetestActivate)
// Start test block
describe('Invest from Vault',async function () {


  before(async function () {
    gluwaCoin = (await testHelper.LuniverseContractInstancelize()).gluwaCoin;
    prizeLinkedAccountVault = (await testHelper.LuniverseContractInstancelize()).prizeLinkedAccountVault;
    provider = (await testHelper.LuniverseContractInstancelize()).provider;
    
  });

  beforeEach(async function () {
    owner = (await testHelper.LuniverseContractInstancelize()).owner; 
    user1 = await ethers.Wallet.createRandom();
    user2 = await ethers.Wallet.createRandom();
    user3 = await ethers.Wallet.createRandom();
    lender = await ethers.Wallet.createRandom();
    ownerAddress = owner.address;
    abi = [ "event Invested(address indexed recipient, uint256 amount)" ];
    iface = new ethers.utils.Interface(abi);
  
    input = await gluwaCoin.populateTransaction.mint(user1.address, mintAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.connect(user1).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
    await testHelper.submitRawTxn(input, user1, ethers, provider);
  });
  // it('can Operator invest?', async function () {
  //   currBalance = await gluwaCoin.balanceOf(prizeLinkedAccountVault.address);
  //   input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
  //   res = await testHelper.submitRawTxn(input, owner, ethers, provider);
  //   expect(parseInt(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address))).to.equal(parseInt(currBalance)+parseInt(depositAmount));
  //   expect(await gluwaCoin.balanceOf(lender.address)).to.equal(0);
  //   var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
  //   input = await prizeLinkedAccountVault.populateTransaction.invest(lender.address, investAmount);
  //   receipt = await testHelper.submitRawTxn(input, owner, ethers, provider);
  //   var event;
  //   for(var i=0;i<receipt.logs.length; i++){
  //     try{
  //       event = iface.parseLog(receipt.logs[i]).args;
  //     }catch(err){}
  //   }    
  //   expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
  //   expect(event[0]).to.equal(lender.address);
  //   expect(event[1]).to.equal(investAmount);

  // });


  it('can Operator invest to himself/herself?', async function () {
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);

    var originalAmount = await gluwaCoin.balanceOf(owner.address);
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    input = await prizeLinkedAccountVault.populateTransaction.invest(owner.address, investAmount);
    receipt = await testHelper.submitRawTxn(input, owner, ethers, provider);

    var event;
    for(var i=0;i<receipt.logs.length; i++){
      try{
        event = iface.parseLog(receipt.logs[i]).args;
      }catch(err){}
    }    
    expect(await gluwaCoin.balanceOf(owner.address)).to.equal(investAmount + BigInt(originalAmount));
    expect(event[0]).to.equal(owner.address);
    expect(event[1]).to.equal(investAmount);

  });

  it('can new-Operator invest?', async function () {
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    currBalance = await gluwaCoin.balanceOf(lender.address);
    input = await prizeLinkedAccountVault.populateTransaction.addOperator(user2.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    input = await prizeLinkedAccountVault.populateTransaction.invest(lender.address, investAmount);
    receipt = await testHelper.submitRawTxn(input, owner, ethers, provider);

    var event;
    for(var i=0;i<receipt.logs.length; i++){
      try{
        event = iface.parseLog(receipt.logs[i]).args;
      }catch(err){}
    }    
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
    expect(event[0]).to.equal(lender.address);
    expect(event[1]).to.equal(investAmount);
  });

  it('can non-Operator invest?', async function () {
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);

    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    input = await prizeLinkedAccountVault.connect(user1).populateTransaction.invest(owner.address, investAmount);
    receipt = await testHelper.submitRawTxn(input, user1, ethers, provider);
    expect(receipt.status).to.equal(0);
  });

  it('can non-Operator invest to itself?', async function () {
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    input = await prizeLinkedAccountVault.connect(user1).populateTransaction.invest(user1.address, investAmount);
    receipt = await testHelper.submitRawTxn(input, user1, ethers, provider);
    expect(receipt.status).to.equal(0);
});

  it('can Admin invest?', async function () {
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await prizeLinkedAccountVault.populateTransaction.addAdmin(user3.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);

    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    input = await prizeLinkedAccountVault.connect(user3).populateTransaction.invest(lender.address, investAmount);
    receipt = await testHelper.submitRawTxn(input, user3, ethers, provider);

    var event;
    for(var i=0;i<receipt.logs.length; i++){
      try{
        event = iface.parseLog(receipt.logs[i]).args;
      }catch(err){}
    }    
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
    expect(event[0]).to.equal(lender.address);
    expect(event[1]).to.equal(investAmount);

  });
  
  it('can invest in a zeroAddress?', async function () {
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);

    var investAmount = depositAmount - BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    input = await prizeLinkedAccountVault.populateTransaction.invest("0x0000000000000000000000000000000000000000", investAmount);
    receipt = await testHelper.submitRawTxn(input, user3, ethers, provider);
    expect(receipt.status).to.equal(0);
  });
  
  it('can invest upto the limit imposed by lowerLimitPercentage?', async function () {
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(0);
    var investAmount = depositAmount - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
    input = await prizeLinkedAccountVault.populateTransaction.invest(lender.address, investAmount);
    receipt = await testHelper.submitRawTxn(input, owner, ethers, provider);

    var event;
    for(var i=0;i<receipt.logs.length; i++){
      try{
        event = iface.parseLog(receipt.logs[i]).args;
      }catch(err){}
    }    
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
    expect(event[0]).to.equal(lender.address);
    expect(event[1]).to.equal(investAmount);

  });

/* 
//PLSA has balance 
it('can invest more than the limit imposed by lowerLimitPercentage?', async function () {
  depositAmount = BigInt(parseInt(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address)));
  input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
  await testHelper.submitRawTxn(input, owner, ethers, provider);
  expect(await gluwaCoin.balanceOf(lender.address)).to.equal(0);
  var investAmount = depositAmount + BigInt(1) - depositAmount * testHelper.lowerLimitPercentage / BigInt(100);
  input = await prizeLinkedAccountVault.populateTransaction.invest(lender.address, investAmount);
  receipt = await testHelper.submitRawTxn(input, owner, ethers, provider);
  expect(receipt.status).to.equal(0);
});
//can't make PLSA have no saving account
it('can invest to withdraw completely when there is no saving account', async function () {
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await prizeLinkedAccountVault.populateTransaction.withdrawFor(user1.address, depositAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.populateTransaction.mint(user2.address, mintAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount + BigInt(3));
    await testHelper.submitRawTxn(input, user2, ethers, provider);
    input = await prizeLinkedAccountVault.populateTransaction.addBoostingFund(user2.address, depositAmount + BigInt(1));
    receipt=await testHelper.submitRawTxn(input, owner, ethers, provider);

    var investAmount = BigInt(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address));
    input = await prizeLinkedAccountVault.populateTransaction.invest(lender.address, investAmount);
    receipt = await testHelper.submitRawTxn(input, owner, ethers, provider);
    var event;
    console.log(receipt)
    for(var i=0;i<receipt.logs.length; i++){
      try{
        event = iface.parseLog(receipt.logs[i]).args;
      }catch(err){}
    }    
    console.log(await prizeLinkedAccountVault.getPrizeLinkedAccountSettings())
    expect(await gluwaCoin.balanceOf(lender.address)).to.equal(investAmount);
    expect(event[0]).to.equal(lender.address);
    expect(event[1]).to.equal(investAmount);
    expect(investAmount).to.equal(depositAmount + BigInt(1));
  });*/
});