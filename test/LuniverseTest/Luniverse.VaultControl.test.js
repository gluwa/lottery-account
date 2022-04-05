const { expect, use } = require('chai');
const { solidity } = require('ethereum-waffle');
const testHelper = require('./sharedLuniverse');
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


if(testHelper.LuniversetestActivate)
// Start test block
describe('Vault Control', function () {
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
    
        input = await gluwaCoin.populateTransaction.mint(user1.address, mintAmount);
        await testHelper.submitRawTxn(input, owner, ethers, provider);
        input = await gluwaCoin.connect(user1).populateTransaction.approve(prizeLinkedAccountVault.address, depositAmount);
        await testHelper.submitRawTxn(input, user1, ethers, provider);
      });
    it('is Admin initialized to the `ownerAddress`?', async function () {
        expect((await prizeLinkedAccountVault.isAdmin(owner.address))).to.equal(true);
    });

    it('is Admin NOT initialized to another address?', async function () {
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(false);
    });

    // addAdmin
    it('can Admin add Admin?', async function () {       
        input = await prizeLinkedAccountVault.populateTransaction.addAdmin(user1.address);   
        await testHelper.submitRawTxn(input, owner, ethers, provider);
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(true);
    });

    it('can new Admin add Admin?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addAdmin(user1.address);   
        await testHelper.submitRawTxn(input, owner, ethers, provider);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addAdmin(user2.address);
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isAdmin(user2.address))).to.equal(true);
    });

    it('can non-Admin Operator add Admin?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user1.address);
        res =  testHelper.submitRawTxn(input, owner, ethers, provider);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addAdmin(user2.address);
        res = await testHelper.submitRawTxn(input, user1, ethers, provider);
        await expect(res.status).to.equal(0);
    });

   

    renounceAdmin
    luniverse can't test with admin renounce since it's a deployed contract
    it('can new Admin renounce Admin?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addAdmin(user1.address);
        res = await testHelper.submitRawTxn(input, owner, ethers, provider);

        expect(res.status).to.equal(1);
        input = await prizeLinkedAccountVault.populateTransaction. ();
        res = await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(false);
    });
    it('can non-Admin Operator renounce Admin?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user1.address);
        res = await testHelper.submitRawTxn(input, owner, ethers, provider);

        input = await prizeLinkedAccountVault.populateTransaction.renounceAdmin();
        res = await testHelper.submitRawTxn(input, user1, ethers, provider);

        expect((await prizeLinkedAccountVault.isAdmin(owner.address))).to.equal(true);
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(false);
    });

    isOperator
    it('is Operator initialized to the `ownerAddress`?', async function () {
        expect((await prizeLinkedAccountVault.isOperator(owner.address))).to.equal(true);
    });

    it('is Operator NOT initialized to another address?', async function () {
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(false);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(false);
    });

    // addOperator
    it('can Admin add Operator?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user1.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(true);
    });

    it('can new Admin add Operator?', async function () {

        input = await prizeLinkedAccountVault.populateTransaction.addAdmin(user1.address);
        res =await testHelper.submitRawTxn(input, owner, ethers, provider);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addOperator(user2.address);
        res = await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);
    });

    it('can non-Admin add Operator?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user2.address);
        res = await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(false);
    });

    it('can non-Admin Operator add Operator?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user1.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);

        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(true);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.addOperator(user2.address);
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(false);
    }); 

    // removeOperator
    it('can Admin remove Operator?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user1.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);

        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(true);
        input = await prizeLinkedAccountVault.populateTransaction.removeOperator(user1.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(false);
    });

    it('can new Admin remove Operator?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addAdmin(user1.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user2.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);

        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);
        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.removeOperator(user2.address);
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(false);
    });

    it('can non-Admin remove Operator?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user2.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);

        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);

        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.removeOperator(user2.address)
        await testHelper.submitRawTxn(input, user1, ethers, provider)
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);
    });

    it('can non-Admin Operator remove Operator?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user1.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user2.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);

        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(true);
        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);

        input = await prizeLinkedAccountVault.populateTransaction.removeOperator(user2.address);
        await testHelper.submitRawTxn(input, user1, ethers, provider);

        expect((await prizeLinkedAccountVault.isOperator(user2.address))).to.equal(true);
    });

    it('can new Admin renounce Operator?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addAdmin(user1.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user1.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);

        input = await prizeLinkedAccountVault.connect(user1).populateTransaction.renounceOperator();
        await testHelper.submitRawTxn(input, user1, ethers, provider);
        expect((await prizeLinkedAccountVault.isOperator(user1.address))).to.equal(false);
        expect((await prizeLinkedAccountVault.isAdmin(user1.address))).to.equal(true);
    });

    it('can non-Admin renounce Operator?', async function () {
        input = await prizeLinkedAccountVault.populateTransaction.addOperator(user1.address);
        await testHelper.submitRawTxn(input, owner, ethers, provider);
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