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
var mintAmount = BigInt(200000000000) * testHelper.decimalsVal;
var depositAmount = BigInt(30000) * testHelper.decimalsVal;
var prizeLinkedAccountVault;
var gluwaCoin;
var gluwaCoin2;
let abi;
let iface;


if(testHelper.LuniversetestActivate)
// Start test block
describe('Withdraw test', function () {
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
        abi = [ "event TicketCreated(uint256 indexed drawTimeStamp, uint256 indexed ticketId, address indexed owner, uint256 upper, uint256 lower)" ];
        iface = new ethers.utils.Interface(abi);    
        input = await gluwaCoin.populateTransaction.mint(user1.address, mintAmount);
        await testHelper.submitRawTxn(input, owner, ethers, provider);
        input = await gluwaCoin.connect(user1).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
        await testHelper.submitRawTxn(input, user1, ethers, provider);
      });
    


    it('withdraw will not affect budget', async function () {
        input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);
        res =await testHelper.submitRawTxn(input,owner, ethers, provider);
        var newDeposit = testHelper.budget - depositAmount + BigInt(1);
        input = await prizeLinkedAccountVault.populateTransaction.withdrawFor(user1.address, depositAmount - BigInt(1));
        res = await testHelper.submitRawTxn(input,owner, ethers, provider);
        // var errorMsg = "GluwacoinSaving: the deposit must be >= min deposit & cannot make the total balance > the budget.";
        input = await gluwaCoin.populateTransaction.approve(prizeLinkedAccountVault.address, newDeposit);
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        input = await gluwaCoin.populateTransaction.approve(prizeLinkedAccountVault.address, newDeposit);
        await testHelper.submitRawTxn(input, user2, ethers, provider);


        input = await prizeLinkedAccountVault.populateTransaction['depositPrizedLinkAccount(address,uint256)'](user1.address, newDeposit);
        res = await testHelper.submitRawTxn(input,owner, ethers, provider);
        expect(res.status).to.equal(0);
        input = await prizeLinkedAccountVault.populateTransaction['depositPrizedLinkAccount(address,uint256)'](user2.address, newDeposit);
        res = await testHelper.submitRawTxn(input,owner, ethers, provider);
        expect(res.status).to.equal(0);
    }); 

    it('check number of tickets after withdrawal', async function () {
        input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);

        receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);

        var ticketEvent;
        for(var i=0;i<receipt.logs.length; i++){
          try{
            ticketEvent = iface.parseLog(receipt.logs[i]).args;
          }catch(err){}
        }    
 
        var drawDate = ticketEvent[0];
        var ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        var totalTickets = BigInt(0);

        for (var i = 0; i < ticketList.length; i++)
        {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper 
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            totalTickets += BigInt(upper) - BigInt(lower);
        }
        expect(totalTickets).to.equal(depositAmount/testHelper.decimalsVal);

        input = await prizeLinkedAccountVault.populateTransaction.withdrawFor(user1.address, depositAmount/BigInt(2));
        await testHelper.submitRawTxn(input,owner, ethers, provider);
        var totalTickets_1 = BigInt(0);

        for (var i = 0; i < ticketList.length; i++)
        {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper 
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);     
            totalTickets_1 += BigInt(upper) - BigInt(lower);
        }
        expect(totalTickets_1).to.equal(totalTickets/BigInt(2));
    });
    it('withdrawal will not change ticket, its order and its id', async function () {
        input = await prizeLinkedAccountVault.connect(owner).populateTransaction['createPrizedLinkAccount(address,uint256,bytes)'](user1.address, depositAmount, user1.address);

        receipt = await testHelper.submitRawTxn(input,owner, ethers, provider);
        var ticketEvent;
        for(var i=0;i<receipt.logs.length; i++){
          try{
            ticketEvent = iface.parseLog(receipt.logs[i]).args;
          }catch(err){}
        }    
        var drawDate = ticketEvent[0];
        var ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        input = await prizeLinkedAccountVault.populateTransaction.withdrawFor(user1.address, depositAmount/BigInt(2));
        await testHelper.submitRawTxn(input,owner, ethers, provider);

        var ticketList_1 = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        for (var i = 0; i < ticketList.length; i++)
        {            
            expect(ticketList[i]).to.equal(ticketList_1[i]);            
        }
        expect(ticketList.length).to.equal(ticketList_1.length);

        input = await gluwaCoin.populateTransaction.approve(prizeLinkedAccountVault.address, 2);
        await testHelper.submitRawTxn(input,user1, ethers, provider);
        input = await prizeLinkedAccountVault.populateTransaction.depositPrizedLinkAccount(user1.address, 2);
        res = await testHelper.submitRawTxn(input,owner, ethers, provider);

        var ticketList_2 = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        input = await prizeLinkedAccountVault.populateTransaction.withdrawFor(user1.address, depositAmount/BigInt(2));
        await testHelper.submitRawTxn(input,user1, ethers, provider);
        var ticketList_3 = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        for (var i = 0; i < ticketList_2.length; i++)
        {            
            expect(ticketList_2[i]).to.equal(ticketList_3[i]);            
        }
        expect(ticketList_2.length).to.equal(ticketList_3.length);
        expect(ticketList_2.length).to.greaterThan(ticketList_1.length);

    });
});