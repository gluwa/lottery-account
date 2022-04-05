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
var mintAmount = BigInt(2000000) * testHelper.decimalsVal;
var depositAmount = BigInt(200) * testHelper.decimalsVal;
var prizeLinkedAccountVault;
var gluwaCoin;
var gluwaCoin2;
var provider;
var LuniverseInstance;

// Start test block

if(testHelper.LuniversetestActivate)
describe('Deposit test', function () {
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
    user2 = await ethers.Wallet.createRandom();
    bank1 = await ethers.Wallet.createRandom();
    bank2 = await ethers.Wallet.createRandom();
    ownerAddress = owner.address;
  });

  beforeEach(async function () {
    input = await gluwaCoin.populateTransaction.mint(user1.address, depositAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.populateTransaction.mint(user2.address, depositAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.connect(user1).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount * BigInt(10));
    await testHelper.submitRawTxn(input, user1, ethers, provider);
  }); 
  it('check base token balance user1', async function () {
    const balance = await gluwaCoin.balanceOf(user1.address);

    expect(await gluwaCoin.balanceOf(user1.address)).to.equal(depositAmount);
  });

  it('check allowance balance user1', async function () {
    expect((await gluwaCoin.allowance(user1.address, prizeLinkedAccountVault.address))).to.equal(depositAmount *  BigInt(10));
  });

  it('check return of create prize-linked account', async function () {
    const result = (await prizeLinkedAccountVault.callStatic["createPrizedLinkAccount(address,uint256,bytes)"](user1.address, depositAmount, user1.address));
    expect(result).to.equal(true);
  });

  it('accountHash should be different even with same user same amount', async function () {
    owner = LuniverseInstance.owner; 
    let abi = [ "event AccountCreated(bytes32 indexed depositHash,address indexed owner)" ];
    let iface = new ethers.utils.Interface(abi);
    var lasthash;
    for(var i=0;i<3;i++){
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount / BigInt(10), user1.address);
      receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var event;
      for(var j=0;j<receipt.logs.length; j++){
        try{
          event = iface.parseLog(receipt.logs[j]);
        }catch(err){}
      }    
      depositHash = event.args[0];
      expect(depositHash).to.not.equal(lasthash);
      lasthash = depositHash;
    }
  });
  it('depositHash should be different even with same user same amount', async function () {
    owner = LuniverseInstance.owner; 
    let abi = [ "event DepositCreated(bytes32 indexed depositHash,address indexed owner,uint256 deposit)" ];
    let iface = new ethers.utils.Interface(abi);
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount / BigInt(10), user1.address);
    var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
    var lasthash;
    for(var i=0;i<3;i++){
      input = await prizeLinkedAccountVault.connect(owner).populateTransaction['depositPrizedLinkAccount(address,uint256)'](user1.address, depositAmount / BigInt(10));
      receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
      var event;
      for(var j=0;j<receipt.logs.length; j++){
        try{
          event = iface.parseLog(receipt.logs[j]);
        }catch(err){}
      }    
      depositHash = event.args[0];
      expect(depositHash).to.not.equal(lasthash);
      lasthash = depositHash;
    }

  });

  it('get prize-linked account info', async function () {
    owner = LuniverseInstance.owner; 
    let abi = [ "event DepositCreated(bytes32 indexed depositHash,address indexed owner,uint256 deposit)" ];
    let iface = new ethers.utils.Interface(abi);
    let abi2 = [ "event TicketCreated(uint256 indexed drawTimeStamp, uint256 indexed ticketId, address indexed owner, uint256 upper, uint256 lower)" ];
    let iface2 = new ethers.utils.Interface(abi2);

    var currentTime = Math.floor(Date.now() / 1000);
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    var receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
    var event;
    for(var i=0;i<receipt.logs.length; i++){
      try{
        event = iface.parseLog(receipt.logs[i]);
      }catch(err){}
    }    
    depositHash = event.args[0];
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

    var ticketEvent;
    for(var i=0;i<receipt.logs.length; i++){
      try{
        ticketEvent = iface2.parseLog(receipt.logs[i]);
      }catch(err){}
    }    
    var drawDate = ticketEvent.args[0];
    var ticketId = ticketEvent.args[1];
    var owner = ticketEvent.args[2];
    var lower = ticketEvent.args[3];
    var upper = ticketEvent.args[4];

    const { 0: deposit_idx,
      1: deposit_accountId,
      2: deposit_owner,
      3: deposit_creationDate,
      4: deposit_amount } = (await prizeLinkedAccountVault.getDeposit(depositHash));


    expect(testHelper.getTimeFromTimestamp(drawDate)).to.equal("12:00:00");
    var timeStampDiff = drawDate - parseInt(deposit_creationDate);
    expect(timeStampDiff).to.greaterThan(testHelper.TOTAL_SECONDS_PER_DAY);
    expect(2 * testHelper.TOTAL_SECONDS_PER_DAY).to.greaterThan(timeStampDiff);

    var range = BigInt(upper) - BigInt(lower) + BigInt(1);
    expect(parseInt(range)).to.equal(parseInt(depositAmount / testHelper.decimalsVal));
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
    input = await gluwaCoin.populateTransaction.mint(user1.address, depositAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.populateTransaction.mint(user2.address, depositAmount);
    await testHelper.submitRawTxn(input, owner, ethers, provider);

    input = await gluwaCoin.connect(user1).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount * BigInt(10));
    await testHelper.submitRawTxn(input,user1, ethers, provider);
    input = await gluwaCoin.connect(user2).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount * BigInt(10));
    await testHelper.submitRawTxn(input,user2, ethers, provider)
    
    currBalance = parseInt(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address));
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
    res = await testHelper.submitRawTxn(input,owner, ethers, provider);
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user2.address, depositAmount, user2.address);
    res = await testHelper.submitRawTxn(input,owner, ethers, provider);
    expect(parseInt(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address))).to.equal(currBalance + parseInt(depositAmount * BigInt(2)));
  });

  it('multiple deposits into one account', async function () {
    
    input = await gluwaCoin.populateTransaction.mint(user1.address, depositAmount * BigInt(10));
    await testHelper.submitRawTxn(input, owner, ethers, provider);
    input = await gluwaCoin.connect(user1).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount * BigInt(10));
    await testHelper.submitRawTxn(input,user1, ethers, provider);

    currBalance = parseInt(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address));
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount * BigInt(4), user1.address);
    await testHelper.submitRawTxn(input,owner, ethers, provider);
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['depositPrizedLinkAccount(address,uint256)'](user1.address, depositAmount * BigInt(3));
    await testHelper.submitRawTxn(input,owner, ethers, provider);
    input = await prizeLinkedAccountVault.connect(owner).populateTransaction['depositPrizedLinkAccount(address,uint256)'](user1.address, depositAmount * BigInt(2));
    await testHelper.submitRawTxn(input,owner, ethers, provider);
    expect(parseInt(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address))).to.equal(currBalance + parseInt(depositAmount * BigInt(9)));
  });

  // the check is removed for sandbox testing
  // it('each address must have only one saving account', async function () {
  //   input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount / BigInt(2), user1.address);
  //   await testHelper.submitRawTxn(input,owner, ethers, provider);
  //   input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount / BigInt(2), user1.address);
  //   receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
  //   expect(receipt.status).to.equals(0);
  // });

  // it('identity hash is reused', async function () {
  //   input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount / BigInt(2), user1.address);
  //   await testHelper.submitRawTxn(input,owner, ethers, provider);
  //   input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount / BigInt(2), user1.address);
  //   receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
  //   expect(receipt.status).to.equals(0);
  // });
});