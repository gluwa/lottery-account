const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./shared');
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
var provider = ethers.provider;
var input;


// Start test block
describe('Vault Control', function () {
    before(async function () {
        [owner, bank1, bank2] = await ethers.getSigners();
        [user1, user2, user3] = await testHelper.createWallets(3, bank1);
    });

    beforeEach(async function () {
        [prizeLinkedAccountVault, gluwaCoin, gluwaCoin2] = await testHelper.setupContractTesting(owner, bank1, bank2, mintAmount, depositAmount);
    });

    it('is Admin initialized to the `ownerAddress`?', async function () {
        expect((await prizeLinkedAccountVault.isAdmin(owner.address))).to.equal(true);
    });

    it('is Admin NOT initialized to another address?', async function () {
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(false);
    });

    // addAdmin
    it('can Admin add Admin?', async function () {       
        await prizeLinkedAccountVault.addAdmin(user1.address);   
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(true);
    });

    it('can new Admin add Admin?', async function () {
        await prizeLinkedAccountVault.addAdmin(user1.address);       
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addAdmin(user2.address);
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isAdmin(user2.address))).to.equal(true);
    });

    it('can non-Admin Operator add Admin?', async function () {
        await prizeLinkedAccountVault.addOperator(user1.address);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addAdmin(user2.address);
        await expect(
            testHelper.submitRawTxn(input, user1, ethers, provider)
        ).to.be.revertedWith(testHelper.errorOnlyAdmin);
    });

   

    // // renounceAdmin
    // luniverse can't test with admin renounce since it's a deployed contract
    it('can Admin renounce Admin?', async function () {
        expect((await prizeLinkedAccountVault.isAdmin(owner.address))).to.equal(true);
        await prizeLinkedAccountVault.renounceAdmin();
        expect((await prizeLinkedAccountVault.isAdmin(owner.address))).to.equal(false);
    });
    it('can new Admin renounce Admin?', async function () {
        await prizeLinkedAccountVault.addAdmin(user1.address);
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(true);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.renounceAdmin();
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(false);
    });

    it('can non-Admin Operator renounce Admin?', async function () {
        await prizeLinkedAccountVault.addOperator(user1.address);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.renounceAdmin();
        await testHelper.submitRawTxn(input, user1, ethers, provider);

        expect((await prizeLinkedAccountVault.isAdmin(owner.address))).to.equal(true);
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(false);
    });

    // isOperator
    it('is Operator initialized to the `ownerAddress`?', async function () {
        expect((await prizeLinkedAccountVault.isOperator(owner.address))).to.equal(true);
    });

    it('is Operator NOT initialized to another address?', async function () {
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(false);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(false);
    });

    // addOperator
    it('can Admin add Operator?', async function () {
        await prizeLinkedAccountVault.addOperator(user1.address);
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(true);
    });

    it('can new Admin add Operator?', async function () {
        await prizeLinkedAccountVault.addAdmin(user1.address);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addOperator(user2.address);
        await testHelper.submitRawTxn(input, user1, ethers, provider);

        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);
    });

    it('can non-Admin add Operator?', async function () {
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addOperator(user2.address);
        await expect(
            testHelper.submitRawTxn(input, user1, ethers, provider)
        ).to.be.revertedWith(testHelper.errorOnlyAdmin);
    });

    it('can non-Admin Operator add Operator?', async function () {
        await prizeLinkedAccountVault.addOperator(user1.address);
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(true);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addOperator(user2.address);
        await expect(
            testHelper.submitRawTxn(input, user1, ethers, provider)
        ).to.be.revertedWith(testHelper.errorOnlyAdmin);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(false);
    }); 

    // // removeOperator
    it('can Admin remove Operator?', async function () {
        await prizeLinkedAccountVault.addOperator(user1.address);
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(true);
        input = await prizeLinkedAccountVault.removeOperator(user1.address);
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(false);
    });

    it('can new Admin remove Operator?', async function () {
        await prizeLinkedAccountVault.addAdmin(user1.address);
        await prizeLinkedAccountVault.addOperator(user2.address);

        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.removeOperator(user2.address);
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(false);
    });

    it('can non-Admin remove Operator?', async function () {
        await prizeLinkedAccountVault.addOperator(user2.address);

        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);

        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.removeOperator(user2.address)
        await expect(
            testHelper.submitRawTxn(input, user1, ethers, provider)
        ).to.be.revertedWith(testHelper.errorOnlyAdmin);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);
    });

    it('can non-Admin Operator remove Operator?', async function () {
        await prizeLinkedAccountVault.addOperator(user1.address);
        await prizeLinkedAccountVault.addOperator(user2.address);

        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(true);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);

        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.removeOperator(user2.address)
        await expect(
            testHelper.submitRawTxn(input, user1, ethers, provider)
        ).to.be.revertedWith(testHelper.errorOnlyAdmin);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);
    });


    // // renounceOperator
    it('can Admin renounce Operator?', async function () {
        expect((await prizeLinkedAccountVault.isOperator(owner.address))).to.equal(true);
        await prizeLinkedAccountVault.renounceOperator();
        expect((await prizeLinkedAccountVault.isOperator(owner.address))).to.equal(false);
        expect((await prizeLinkedAccountVault.isAdmin(owner.address))).to.equal(true);
    });

    it('can new Admin renounce Operator?', async function () {
        await prizeLinkedAccountVault.addAdmin(user1.address);

        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addOperator(user1.address);
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.renounceOperator();
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(false);
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(true);
    });

    it('can non-Admin renounce Operator?', async function () {
        await prizeLinkedAccountVault.addOperator(user1.address);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.renounceOperator();
        await testHelper.submitRawTxn(input, user1, ethers, provider);

        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(false);
    });

    it('can non-Operator renounce Operator?', async function () {
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.renounceOperator();
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(false);
    });

   
    
});