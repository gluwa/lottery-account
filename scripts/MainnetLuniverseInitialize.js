const { utils } = require('ethers');
const { hexZeroPad } = require('ethers/lib/utils');
const abi = require('../test/LuniverseTest/abi');
// const PLSASandBoxAddress = "0xd69dbd8efd2df7a18265e3d708b7042414d30d64";//Staging proxy
const PLSASandBoxAddress = "0x4988fa8a091ca9ceba24daa0163d326d10b99a80";//PRD 
const operator = "0xBAFCb499A3147dc72A1572B70aBC59c74fFd7687";
const privateKey = "";
// const privateKey = "";//PRD boosting fund address
const luniversePRC = "http://baas-rpc.luniverse.io:8545?lChainId=3158073271666164067";  
const GluwaCoinAddress = "0x39589FD5A1D4C7633142A178F2F2b30314FB2BaF";// Prod env
const name = 'Gluwacoin';
const symbol = 'Gluwacoin';
const decimals = 18;
const lowerLimitPercentage = BigInt(30);
const standardInterestRate = 4;
const standardInterestRatePercentageBase = 36500;
const cutOffHour = 11;
const cutOffMinute = 59;
const ticketRangeFactor = 1;
const decimalsVal = BigInt(10) ** BigInt(decimals);
const budget = BigInt(1000000) * BigInt(10 ** 6);
const ticketPerToken = 1;
const processingCap = 110;
const winningChanceFactor = 13;

const boostingProvider="0xbD1eaB0976DF35A5a515B78e2bC6b44458F0C838";
async function main(){
    var provider = new ethers.providers.JsonRpcProvider(luniversePRC);
    var owner = new ethers.Wallet(privateKey,provider);
    gluwaCoin = await new ethers.Contract(GluwaCoinAddress, abi.Token, owner);
    prizeLinkedAccountVault = await new ethers.Contract(PLSASandBoxAddress, abi.PLSA, owner);

    input = await prizeLinkedAccountVault.populateTransaction.initialize(owner.address, gluwaCoin.address, standardInterestRate,
      standardInterestRatePercentageBase, budget, ticketPerToken,
      cutOffHour, cutOffMinute, processingCap, winningChanceFactor, lowerLimitPercentage);
    receipt = await submitRawTxn(input, owner, ethers, provider);
    console.log(receipt)

    input = await prizeLinkedAccountVault.populateTransaction.addAdmin(operator);
    receipt = await submitRawTxn(input, owner, ethers, provider);
    console.log(receipt)

    input = await prizeLinkedAccountVault.populateTransaction.addOperator(operator);
    receipt = await submitRawTxn(input, owner, ethers, provider);
    console.log(receipt)

    input = await prizeLinkedAccountVault.populateTransaction.addBoostingFund(boostingProvider,BigInt(10 * 10**6));
    res = await submitRawTxn(input, owner, ethers, provider);
    console.log(res)

    console.log(await prizeLinkedAccountVault.getBoostingFund());
    console.log(await prizeLinkedAccountVault.getVersion())

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
main().then(()=>process.exit(0)).catch((err)=>{
    console.error(err);
    process.exit(1);
});