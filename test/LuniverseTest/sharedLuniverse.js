const abi = require('./abi');
const PLSASandBoxAddress = "0xe53f1c3d5eb19e6f393e510a1205d71a5a54272d";
// const PLSASandBoxAddress = "0x0022684736f4ca57d37881d8093e4f97d28cb568";
const privateKey = "***REMOVED***";
const luniversePRC = "http://baas-rpc.luniverse.io:8545?lChainId=1635501961136826136";  
const GluwaCoinAddress = "0x527C4222550b07aabF5Fe301aD88C5799E944Bf1";
async function createWallets(numberOfWallet, etherFaucetAddress) {
    let wallets = [];
    for (var i = 0; i < numberOfWallet; i++) {
        var temp = await ethers.Wallet.createRandom();
        await etherFaucetAddress.sendTransaction({
            to: temp.address,
            value: ethers.utils.parseEther("10")
        });
        wallets[i] = temp;
    }
    return wallets;
}
async function LuniverseContractInstancelize(){
    var provider = new ethers.providers.JsonRpcProvider(luniversePRC);
    var owner = new ethers.Wallet(privateKey,provider);
    gluwaCoin = await new ethers.Contract(GluwaCoinAddress, abi.Token, owner);
    prizeLinkedAccountVault = await new ethers.Contract(PLSASandBoxAddress, abi.PLSA, owner);
    input = await prizeLinkedAccountVault.populateTransaction.initialize(owner.address, gluwaCoin.address, standardInterestRate,
      standardInterestRatePercentageBase, budget, ticketPerToken,
      cutOffHour, cutOffMinute, processingCap, ticketRangeFactor, lowerLimitPercentage);
    receipt = await submitRawTxn(input, owner, ethers, provider);

    input = await prizeLinkedAccountVault.populateTransaction.addOperator(owner.address);
    receipt = await submitRawTxn(input, owner, ethers, provider);
    input = await prizeLinkedAccountVault.populateTransaction.setPrizeLinkedAccountSettings(
        standardInterestRate,
      standardInterestRatePercentageBase, budget, ticketPerToken,1,
      cutOffHour, cutOffMinute, processingCap, ticketRangeFactor, lowerLimitPercentage
      );
    await submitRawTxn(input, owner, ethers, provider);
    return {gluwaCoin, prizeLinkedAccountVault, owner, provider}
}
async function setupContractTesting(owner, user1, user2, mintAmount, depositAmount) {
    var provider = new ethers.providers.JsonRpcProvider(luniversePRC);
    var owner = new ethers.Wallet(privateKey,provider);
    gluwaCoin = await new ethers.Contract(GluwaCoinAddress, abi.Token, owner);

    this.Gluwacoin = await ethers.getContractFactory("SandboxGluwacoin");
    this.Gluwacoin2 = await ethers.getContractFactory("SandboxGluwacoin");
    this.PrizeLinkedAccountVault = await ethers.getContractFactory("SandboxPrizeLinkedAccountVault", {
        libraries: {
            GluwaAccountModel: GluwaAccountModel.address,
            DateTimeModel: DateTimeModel.address
        },
    });
    gluwaCoin = await this.Gluwacoin.deploy(name, symbol, decimals);
    gluwaCoin2 = await this.Gluwacoin2.deploy(name, symbol, decimals);
    prizeLinkedAccountVault = await this.PrizeLinkedAccountVault.deploy();
    await gluwaCoin.deployed();
    await gluwaCoin2.deployed();
    await prizeLinkedAccountVault.deployed();
    gluwaCoinAddress = gluwaCoin.address;
    prizeLinkedAccountVault.address = prizeLinkedAccountVault.address;
    prizeLinkedAccountVault.initialize(owner.address, gluwaCoinAddress, standardInterestRate,
        standardInterestRatePercentageBase, budget, ticketPerToken,
        cutOffHour, cutOffMinute, processingCap, ticketRangeFactor, lowerLimitPercentage);
    gluwaCoin.mint(owner.address, mintAmount);
    gluwaCoin.mint(user1.address, mintAmount);
    gluwaCoin.mint(user2.address, mintAmount);
    await gluwaCoin.connect(user1).approve(prizeLinkedAccountVault.address, depositAmount);
    await gluwaCoin.connect(user2).approve(prizeLinkedAccountVault.address, depositAmount);
    return [prizeLinkedAccountVault, gluwaCoin, gluwaCoin2];
}

async function createPrizeLinkedAccountStandard(prizeLinkedAccountVault, address, depositAmount, identity) {
    return await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,bytes)"](address, depositAmount, identity);
}

async function createPrizeLinkedAccountSandBox(prizeLinkedAccountVault, address, depositAmount, depositTime, identity) {
    return await prizeLinkedAccountVault["createPrizedLinkAccount(address,uint256,uint256,bytes)"](address, depositAmount, depositTime, identity);
}

async function depositPrizeLinkedAccountStandard(prizeLinkedAccountVault, address, depositAmount) {
    return await prizeLinkedAccountVault["depositPrizedLinkAccount(address,uint256)"](address, depositAmount);
}

async function depositPrizeLinkedAccountSandBox(prizeLinkedAccountVault, address, depositAmount, depositTime) {
    return await prizeLinkedAccountVault["depositPrizedLinkAccount(address,uint256,uint256)"](address, depositAmount, depositTime);
}

function getTimeFromTimestamp(timestamp) {
    // return the time format as HH:mm:ss
    return new Date(timestamp * 1000).toISOString().slice(-13, -5);
}


function getTimeFromTimestamp(timestamp) {
    // return the time format as HH:mm:ss
    return new Date(timestamp * 1000).toISOString().slice(-13, -5);
}

async function submitRawTxn(input, sender, ethers, provider) {
    const txCount = await provider.getTransactionCount(sender.address);
    var rawTx = {
        nonce: ethers.utils.hexlify(txCount),
        to: input.to,
        value: 0x00,
        gasLimit: ethers.utils.hexlify(1950000),
        gasPrice: ethers.utils.hexlify(2381000000000),
        data: input.data
    };
    const rawTransactionHex = await sender.signTransaction(rawTx);
    const { hash } = await provider.sendTransaction(rawTransactionHex);
    return await provider.waitForTransaction(hash);
}

const TOTAL_SECONDS_PER_DAY = 86400;
const ACCOUNT_ACTIVE_STAGE = 1;

const name = 'Gluwacoin';
const symbol = 'Gluwacoin';
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

const errorOnlyAdmin = "Restricted to Admins.";


module.exports = {
    getTimeFromTimestamp, createWallets,
    submitRawTxn, setupContractTesting, createPrizeLinkedAccountStandard, createPrizeLinkedAccountSandBox,
    depositPrizeLinkedAccountStandard, depositPrizeLinkedAccountSandBox,
    TOTAL_SECONDS_PER_DAY,
    ACCOUNT_ACTIVE_STAGE,
    name, symbol, decimals,
    lowerLimitPercentage, standardInterestRate, standardInterestRatePercentageBase, cutOffHour, cutOffMinute, ticketRangeFactor,
    decimalsVal, budget, ticketPerToken, processingCap,
    errorOnlyAdmin, LuniverseContractInstancelize
}