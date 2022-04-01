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
async function setupContractTesting(owner, user1, user2, mintAmount, depositAmount) {
    // this.GluwaAccountModel = await ethers.getContractFactory("GluwaAccountModel");
    // this.DateTimeModel = await ethers.getContractFactory("DateTimeModel");
    // var GluwaAccountModel = await this.GluwaAccountModel.deploy();
    // var DateTimeModel = await this.DateTimeModel.deploy();
    // await DateTimeModel.deployed();
    // await GluwaAccountModel.deployed();
    this.Gluwacoin = await ethers.getContractFactory("SandboxGluwacoin");
    this.Gluwacoin2 = await ethers.getContractFactory("SandboxGluwacoin");
    this.PrizeLinkedAccountVault = await ethers.getContractFactory("SandboxPrizeLinkedAccountVault"); 
    //Library linking is not applicable for Luniverse
    // this.PrizeLinkedAccountVault = await ethers.getContractFactory("SandboxPrizeLinkedAccountVault");
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
        cutOffHour, cutOffMinute, processingCap, winningChanceFactor, lowerLimitPercentage);
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
    return new Date(timestamp * 1000).toISOString().slice(11, 19);
}

async function submitRawTxn(input, sender, ethers, provider) {
    const txCount = await provider.getTransactionCount(sender.address);
    var rawTx = {
        nonce: ethers.utils.hexlify(txCount),
        to: input.to,
        value: 0x00,
        gasLimit: ethers.utils.hexlify(1950000),
        gasPrice: ethers.utils.hexlify(5000),
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
const winningChanceFactor = 3;
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
    lowerLimitPercentage, standardInterestRate, standardInterestRatePercentageBase, cutOffHour, cutOffMinute,
    winningChanceFactor, ticketRangeFactor,
    decimalsVal, budget, ticketPerToken, processingCap,
    errorOnlyAdmin
}