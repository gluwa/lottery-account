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
var mintAmount = BigInt(200000000000) * testHelper.decimalsVal;
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


    it('withdraw will not affect budget', async function () {
        await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
        var newDeposit = testHelper.budget - depositAmount + BigInt(1);
        await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount - BigInt(1));

        var errorMsg = "GluwacoinSaving: the deposit must be >= min deposit & cannot make the total balance > the budget.";
        await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, newDeposit);
        await gluwaCoin.connect(user2).approve(prizeLinkedAccountVault.address, newDeposit);

        await expect(
            testHelper.depositPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, newDeposit)
        ).to.be.revertedWith(errorMsg);

        await expect(
            testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user2.address, newDeposit, user2.address)
        ).to.be.revertedWith(errorMsg);

    });

    it('check number of tickets after withdrawal', async function () {
        var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
        var receipt = await accountTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;
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

        await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount/BigInt(2));

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
        var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
        var receipt = await accountTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;
        var drawDate = ticketEvent[0];
        var ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount/BigInt(2));

        var ticketList_1 = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);


        for (var i = 0; i < ticketList.length; i++)
        {            
            expect(ticketList[i]).to.equal(ticketList_1[i]);            
        }
        expect(ticketList.length).to.equal(ticketList_1.length);

        await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, 2);

        await testHelper.depositPrizeLinkedAccountStandard(prizeLinkedAccountVault,user1.address, 2);

        var ticketList_2 = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount/BigInt(2));

        var ticketList_3 = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        for (var i = 0; i < ticketList_2.length; i++)
        {            
            expect(ticketList_2[i]).to.equal(ticketList_3[i]);            
        }
        expect(ticketList_2.length).to.equal(ticketList_3.length);
        expect(ticketList_2.length).to.greaterThan(ticketList_1.length);

    });
});