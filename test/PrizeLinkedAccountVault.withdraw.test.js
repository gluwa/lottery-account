const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./shared');
var chai = require('chai');
const { BigNumber } = require('ethers');
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
describe('Withdraw test', function () {
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

    it('cannot self withdraw lesser than 1 token', async function () {
        await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);

        await expect(
            prizeLinkedAccountVault.connect(user1).withdraw(testHelper.decimalsVal - BigInt(1))
        ).to.be.revertedWith("GluwaPrizeLinkedAccount: Withdrawal amount is too small.");
    });

    it('can self withdraw 1 token', async function () {
        await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
        await prizeLinkedAccountVault.connect(user1).withdraw(testHelper.decimalsVal);

        const { 0: savingAccount_idx,
            1: savingAccount_hash,
            2: savingAccount_owner,
            3: savingAccount_creationDate,
            4: savingAccount_balance,
            5: savingAccount_earning,
            6: savingAccount_state,
            7: savingAccount_securityReferenceHash } = (await prizeLinkedAccountVault.getSavingAcountFor(user1.address));

        expect(savingAccount_balance).to.equal(depositAmount - testHelper.decimalsVal);
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

        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            totalTickets += BigInt(upper) - BigInt(lower) + BigInt(1);
        }
        expect(totalTickets).to.equal(depositAmount / testHelper.decimalsVal);

        await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount / BigInt(2));

        var totalTickets_1 = BigInt(0);

        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            totalTickets_1 += BigInt(upper) - BigInt(lower) + BigInt(1);
        }
        expect(totalTickets_1).to.equal(totalTickets / BigInt(2));
    });

    it('make subsequent deposits and withdraw lesser than the first deposit', async function () {
        var withdrawnTicket = BigInt(3);
        await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, BigInt(3) * depositAmount);
        var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY - 10;
        var depositTime2 = ((Date.now() / 1000) | 0) - 10;
        var accountTxn = await testHelper.createPrizeLinkedAccountSandBox(prizeLinkedAccountVault, user1.address, depositAmount, depositTime1, user1.address);

        var receipt = await accountTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;

        var drawDate1 = ticketEvent[0];
        var depoistTxn = await testHelper.depositPrizeLinkedAccountSandBox(prizeLinkedAccountVault, user1.address, depositAmount, depositTime2);
        receipt = await depoistTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;
        var drawDate2 = ticketEvent[0];

        await prizeLinkedAccountVault.withdrawFor(user1.address, withdrawnTicket * testHelper.decimalsVal);


        expect((await prizeLinkedAccountVault.getEligibleAddressPendingAddedToDraw(drawDate2)).length).to.equal(0);
        var ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate1, user1.address);
        var totalTickets1 = BigInt(0);

        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            totalTickets1 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
        }
        expect(totalTickets1).to.equal(depositAmount / testHelper.decimalsVal - withdrawnTicket);

        ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate2, user1.address);
        var totalTickets2 = BigInt(0);

        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            totalTickets2 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
        }
        expect(totalTickets2).to.equal(BigInt(2) * depositAmount / testHelper.decimalsVal - withdrawnTicket);
    });

    it('make subsequent deposits and withdraw the same amount like the first deposit', async function () {
        var withdrawnTicket = depositAmount / testHelper.decimalsVal;
        await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, BigInt(3) * depositAmount);
        var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY - 10;
        var depositTime2 = ((Date.now() / 1000) | 0) - 10;
        var accountTxn = await testHelper.createPrizeLinkedAccountSandBox(prizeLinkedAccountVault, user1.address, depositAmount, depositTime1, user1.address);

        var receipt = await accountTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;

        var drawDate1 = ticketEvent[0];
        var depoistTxn = await testHelper.depositPrizeLinkedAccountSandBox(prizeLinkedAccountVault, user1.address, depositAmount, depositTime2);
        receipt = await depoistTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;
        var drawDate2 = ticketEvent[0];
        await prizeLinkedAccountVault.withdrawFor(user1.address, withdrawnTicket * testHelper.decimalsVal);

        expect((await prizeLinkedAccountVault.getEligibleAddressPendingAddedToDraw(drawDate2)).length).to.equal(0);
        var ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate1, user1.address);
        var totalTickets1 = BigInt(0);

        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            if (lower > 0) {
                totalTickets1 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
            }
        }
        expect(totalTickets1).to.equal(BigInt(0));

        ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate2, user1.address);
        var totalTickets2 = BigInt(0);
        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            totalTickets2 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
        }
        expect(totalTickets2).to.equal(depositAmount / testHelper.decimalsVal);
    });


    it('deposit and withdraw after cutoff', async function () {
        var withdrawnTicket = BigInt(3);
        await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, BigInt(3) * depositAmount);
        var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY - 10;
        var accountTxn = await testHelper.createPrizeLinkedAccountSandBox(prizeLinkedAccountVault, user1.address, depositAmount, depositTime1, user1.address);

        var receipt = await accountTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;

        var drawDate1 = ticketEvent[0];
        var drawDate2 = drawDate1.toBigInt() + BigInt(testHelper.TOTAL_SECONDS_PER_DAY);

        await prizeLinkedAccountVault.withdrawFor(user1.address, withdrawnTicket * testHelper.decimalsVal);

        expect((await prizeLinkedAccountVault.getEligibleAddressPendingAddedToDraw(drawDate2)).length).to.equal(1);
        await prizeLinkedAccountVault.regenerateTicketForNextDraw(drawDate2);
        expect((await prizeLinkedAccountVault.getEligibleAddressPendingAddedToDraw(drawDate2)).length).to.equal(0);

        var ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate1, user1.address);
        var totalTickets1 = BigInt(0);

        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            if (lower > 0) {
                totalTickets1 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
            }
        }
        expect(totalTickets1).to.equal(depositAmount / testHelper.decimalsVal - withdrawnTicket);

        ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate2, user1.address);
        var totalTickets2 = BigInt(0);

        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            totalTickets2 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
        }
        expect(totalTickets2).to.equal(depositAmount / testHelper.decimalsVal - withdrawnTicket);
    });


    it('check number of tickets after withdrawal - including removed range', async function () {
        await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, BigInt(10) * depositAmount);
        var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);

        var receipt = await accountTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;
        var drawDate = ticketEvent[0];
        var totalTickets = depositAmount / testHelper.decimalsVal;

        for (var i = 0; i < 6; i++) {
            await testHelper.depositPrizeLinkedAccountSandBox(prizeLinkedAccountVault, user1.address, depositAmount, drawDate.toBigInt() - BigInt(testHelper.TOTAL_SECONDS_PER_DAY + 1));
            totalTickets += depositAmount / testHelper.decimalsVal;
        }

        var ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        var oldLower = BigInt(0);
        var oldUpper = BigInt(0);
        var totalTickets_1 = BigInt(0);
        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            if (i == 1) {
                oldLower = lower.toBigInt();
                oldUpper = upper.toBigInt();
            }
            totalTickets_1 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
        }

        expect(totalTickets).to.equal(totalTickets_1);
        await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount + testHelper.decimalsVal);
        var totalTickets_2 = BigInt(0);

        for (var i = 0; i < ticketList.length; i++) {
            const {
                0: id,
                1: owner,
                2: lower,
                3: upper
            } = await prizeLinkedAccountVault.getTicketRangeById(ticketList[i]);
            if (i == 0) {
                expect(lower.toNumber()).to.equal(0);
                expect(upper.toNumber()).to.equal(0);
            }
            else {
                if (i == 1) {
                    var newLower = lower.toBigInt() - BigInt(1);
                    expect(newLower).to.equal(oldLower);
                    expect(upper.toBigInt()).to.equal(oldUpper);
                }

                totalTickets_2 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
            }
        }
        var expectedNewTotal = totalTickets_1 - (depositAmount + testHelper.decimalsVal) / testHelper.decimalsVal;
        expect(expectedNewTotal).to.equal(totalTickets_2);
        var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
        expect(max).to.equal(BigInt(7) * depositAmount / testHelper.decimalsVal + BigInt(testHelper.winningChanceFactor) * (BigInt(6) * depositAmount / testHelper.decimalsVal - BigInt(1)));
        expect(max).to.equal(BigInt(testHelper.winningChanceFactor + 1) * (BigInt(6) * depositAmount / testHelper.decimalsVal - BigInt(1)) + min.toBigInt() - BigInt(1));

    });

    it('check number of tickets after consecutive withdrawal - including removed range', async function () {
        var totalTickets = BigInt(10);
        await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, totalTickets * testHelper.decimalsVal);
        var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, testHelper.decimalsVal, user1.address);

        var receipt = await accountTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;
        var drawDate = ticketEvent[0];

        for (var i = 0; i < totalTickets - BigInt(1); i++) {
            await testHelper.depositPrizeLinkedAccountSandBox(prizeLinkedAccountVault, user1.address, testHelper.decimalsVal, drawDate.toBigInt() - BigInt(testHelper.TOTAL_SECONDS_PER_DAY + 1));
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
            if (i < 2) {
                expect(lower.toNumber()).to.equal(0);
                expect(upper.toNumber()).to.equal(0);
            }
            else {
                totalTickets_2 += upper.toBigInt() - lower.toBigInt() + BigInt(1);
            }
        }
        var expectedNewTotal = totalTickets_1 - BigInt(2);
        expect(expectedNewTotal).to.equal(totalTickets_2);
        var { 0: min, 1: max } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
        expect(max).to.equal(BigInt(testHelper.winningChanceFactor + 1) * (totalTickets - min.toBigInt() + BigInt(1)) + min.toBigInt() - BigInt(1));
    });


    it('withdrawal will not change ticket, its order and its id', async function () {
        var accountTxn = await testHelper.createPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, depositAmount, user1.address);
        var receipt = await accountTxn.wait();
        var ticketEvent = receipt.events.filter(function (one) {
            return one.event == "TicketCreated";
        })[0].args;
        var drawDate = ticketEvent[0];
        var ticketList = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount / BigInt(2));

        var ticketList_1 = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);


        for (var i = 0; i < ticketList.length; i++) {
            expect(ticketList[i]).to.equal(ticketList_1[i]);
        }
        expect(ticketList.length).to.equal(ticketList_1.length);

        await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, 2);

        await testHelper.depositPrizeLinkedAccountStandard(prizeLinkedAccountVault, user1.address, 2);

        var ticketList_2 = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        await prizeLinkedAccountVault.withdrawFor(user1.address, depositAmount / BigInt(2));

        var ticketList_3 = await prizeLinkedAccountVault.getTickerIdsByOwnerAndDrawFor(drawDate, user1.address);

        for (var i = 0; i < ticketList_2.length; i++) {
            expect(ticketList_2[i]).to.equal(ticketList_3[i]);
        }
        expect(ticketList_2.length).to.equal(ticketList_3.length);
        expect(ticketList_2.length).to.greaterThan(ticketList_1.length);

    });

    it('withdraw wont affect the general winning chance', async function () {
        var user2;
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
            if (i == 2) {
                user2 = temp.address;
            }
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

        var upperFactored = BigInt(upper) + (depositAmount * BigInt(testHelper.winningChanceFactor * 10)) / BigInt(10 ** 18);
        expect(upperFactored).to.equal(max);

        await prizeLinkedAccountVault.withdrawFor(user2, depositAmount / BigInt(2));

        var { 0: min1, 1: max1 } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate);
        upperFactored = upper.toBigInt() - depositAmount / BigInt(2 * 10 ** 18) + (depositAmount * BigInt(9) + depositAmount / BigInt(2)) * BigInt(testHelper.winningChanceFactor) / BigInt(10 ** 18);
        expect(upperFactored).to.equal(max1);

    });

    it('verify winning chance for the next draw', async function () {
        var users = [];
        var drawDate1 = BigInt(0);
        var upper1 = BigInt(0);
        var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
        for (var i = 0; i < 10; i++) {
            var temp = await ethers.Wallet.createRandom();
            await gluwaCoin.mint(temp.address, mintAmount);
            await bank2.sendTransaction({
                to: temp.address,
                value: ethers.utils.parseEther("1")
            });
            users[i] = temp.address;
            var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
            await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
            var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime1, temp.address);
            var receipt = await accountTxn.wait();

            var ticketEvent = receipt.events.filter(function (one) {
                return one.event == "TicketCreated";
            })[0].args;

            drawDate1 = ticketEvent[0];
            upper1 = ticketEvent[4];

        }
        await prizeLinkedAccountVault.makeDrawV1_Dummy(drawDate1, 999999999999999);
        await prizeLinkedAccountVault.awardWinnerV1(drawDate1);

        var upper2 = 0;
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
            upper2 = ticketEvent[4];

        }

        await prizeLinkedAccountVault.withdrawFor(users[2], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users[5], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.regenerateTicketForNextDraw(drawDate2);

        const randomMax = 99999999;
        const randomMin = 10000000;
        await prizeLinkedAccountVault.makeDrawV1_NoValidation(drawDate2, Math.floor(Math.random() * (randomMax - randomMin) + randomMin));

        var { 0: min1, 1: max1 } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate1);
        var ticketUpperVal1 = (depositAmount * BigInt(10)) / BigInt(10 ** 18);
        var upperFactored = BigInt(ticketUpperVal1) + (depositAmount * BigInt(testHelper.winningChanceFactor * 10)) / BigInt(10 ** 18);
        expect(upper1).to.equal(ticketUpperVal1);
        expect(upperFactored).to.equal(max1);

        var { 0: min2, 1: max2 } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate2);
        var ticketUpperVal2 = (depositAmount * BigInt(24)) / BigInt(10 ** 18);
        upperFactored = BigInt(ticketUpperVal2) + depositAmount * BigInt(24) * BigInt(testHelper.winningChanceFactor) / BigInt(10 ** 18);
        expect(upperFactored).to.equal(max2);
        var newUpper = upper2.toBigInt() + upper1.toBigInt() - BigInt(depositAmount / BigInt(10 ** 18));
        expect(newUpper).to.equal(ticketUpperVal2);

    });


    it('verify number of tickets removed for draw when withdrawing', async function () {
        var users1 = [];
        var drawDate1 = BigInt(0);
        var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
        for (var i = 0; i < 10; i++) {
            var temp = await ethers.Wallet.createRandom();
            await gluwaCoin.mint(temp.address, mintAmount);
            await bank2.sendTransaction({
                to: temp.address,
                value: ethers.utils.parseEther("1")
            });
            users1[i] = temp.address;
            var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
            await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
            var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime1, temp.address);
            var receipt = await accountTxn.wait();

            var ticketEvent = receipt.events.filter(function (one) {
                return one.event == "TicketCreated";
            })[0].args;
            drawDate1 = ticketEvent[0];
        }

        var drawDate2 = BigInt(0);
        var depositTime2 = (Date.now() / 1000) | 0;
        var users2 = [];
        for (var i = 0; i < 15; i++) {
            var temp = await ethers.Wallet.createRandom();
            await gluwaCoin.mint(temp.address, mintAmount);
            await bank2.sendTransaction({
                to: temp.address,
                value: ethers.utils.parseEther("1")
            });
            users2[i] = temp.address;
            var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
            await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
            var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime2, temp.address);
            var receipt = await accountTxn.wait();

            var ticketEvent = receipt.events.filter(function (one) {
                return one.event == "TicketCreated";
            })[0].args;
            drawDate2 = ticketEvent[0];
        }

        await prizeLinkedAccountVault.regenerateTicketForNextDraw(drawDate2);


        await prizeLinkedAccountVault.withdrawFor(users1[1], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users1[2], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users1[5], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users1[7], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[2], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[3], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[5], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[7], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[8], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[10], depositAmount / BigInt(2));

        var { 0: min1, 1: max1 } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate1);
        var balance1 = await prizeLinkedAccountVault.getBalanceEachDraw(drawDate1);
        expect(balance1).to.equal(BigInt(depositAmount * BigInt(8)));
        expect(balance1.toBigInt() * (BigInt(1 + testHelper.winningChanceFactor)) / BigInt(10 ** 18)).to.equal(max1);

        var { 0: min2, 1: max2 } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate2);
        var balance2 = await prizeLinkedAccountVault.getBalanceEachDraw(drawDate2);
        expect(balance2).to.equal(BigInt(depositAmount * BigInt(20)));
        expect(balance2.toBigInt() * (BigInt(1 + testHelper.winningChanceFactor)) / BigInt(10 ** 18)).to.equal(max2);
    });

    it('verify number of tickets removed for draw when withdrawing after ticket reissuance', async function () {
        var users1 = [];
        var drawDate1 = BigInt(0);
        var depositTime1 = ((Date.now() / 1000) | 0) - testHelper.TOTAL_SECONDS_PER_DAY;
        for (var i = 0; i < 10; i++) {
            var temp = await ethers.Wallet.createRandom();
            await gluwaCoin.mint(temp.address, mintAmount);
            await bank2.sendTransaction({
                to: temp.address,
                value: ethers.utils.parseEther("1")
            });
            users1[i] = temp.address;
            var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
            await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
            var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime1, temp.address);
            var receipt = await accountTxn.wait();

            var ticketEvent = receipt.events.filter(function (one) {
                return one.event == "TicketCreated";
            })[0].args;
            drawDate1 = ticketEvent[0];
        }

        var drawDate2 = BigInt(0);
        var depositTime2 = (Date.now() / 1000) | 0;
        var users2 = [];
        for (var i = 0; i < 15; i++) {
            var temp = await ethers.Wallet.createRandom();
            await gluwaCoin.mint(temp.address, mintAmount);
            await bank2.sendTransaction({
                to: temp.address,
                value: ethers.utils.parseEther("1")
            });
            users2[i] = temp.address;
            var drawTxn = await gluwaCoin.connect(temp).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
            await testHelper.submitRawTxn(drawTxn, temp, ethers, ethers.provider);
            var accountTxn = await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](temp.address, depositAmount, depositTime2, temp.address);
            var receipt = await accountTxn.wait();

            var ticketEvent = receipt.events.filter(function (one) {
                return one.event == "TicketCreated";
            })[0].args;
            drawDate2 = ticketEvent[0];
        }

        await prizeLinkedAccountVault.withdrawFor(users1[1], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users1[2], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users1[5], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users1[7], depositAmount / BigInt(2));

        await prizeLinkedAccountVault.regenerateTicketForNextDraw(drawDate2);

        var { 0: min1, 1: max1 } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate1);
        var balance1 = await prizeLinkedAccountVault.getBalanceEachDraw(drawDate1);
        expect(balance1).to.equal(BigInt(depositAmount * BigInt(8)));
        expect(balance1.toBigInt() * (BigInt(1 + testHelper.winningChanceFactor)) / BigInt(10 ** 18)).to.equal(max1);


        await prizeLinkedAccountVault.withdrawFor(users2[2], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[3], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[5], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[7], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[8], depositAmount / BigInt(2));
        await prizeLinkedAccountVault.withdrawFor(users2[10], depositAmount / BigInt(2));


        balance1 = await prizeLinkedAccountVault.getBalanceEachDraw(drawDate1);
        expect(balance1).to.equal(BigInt(depositAmount * BigInt(8)));
        expect(balance1.toBigInt() * (BigInt(1 + testHelper.winningChanceFactor)) / BigInt(10 ** 18)).to.equal(max1);

        var { 0: min2, 1: max2 } = await prizeLinkedAccountVault.findMinMaxForDraw(drawDate2);
        var balance2 = await prizeLinkedAccountVault.getBalanceEachDraw(drawDate2);
        expect(balance2).to.equal(BigInt(depositAmount * BigInt(20)));
        expect(balance2.toBigInt() * (BigInt(1 + testHelper.winningChanceFactor)) / BigInt(10 ** 18)).to.equal(max2);
    });

});