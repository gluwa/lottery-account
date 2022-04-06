const abi = require('../test/LuniverseTest/abi');
const PLSASandBoxAddress = "0x88d538741d95390b6f624120de85eea59caee1e0";//Test
// const PLSASandBoxAddress = "0xc8113935a3a457fd9e9c3fd432d0b38308bf07ee";// local
// const PLSASandBoxAddress = "0x444194906b130916a5e569f45a4f6d1f10c8ceaf";// unit test for myself
const operator = "***REMOVED***";
const privateKey = "***REMOVED***";
const luniversePRC = "http://baas-rpc.luniverse.io:8545?lChainId=1635501961136826136";  
const GluwaCoinAddress = "0xdbde880e1405a6914b387606933d7476a2296a06";// test env
const name = 'Gluwacoin';
const symbol = 'Gluwacoin';
const decimals = 18;
const lowerLimitPercentage = BigInt(30);
const standardInterestRate = 4;
const standardInterestRatePercentageBase = 36500;
const cutOffHour = 11;
const cutOffMinute = 59;
const ticketRangeFactor = 100;
const decimalsVal = BigInt(10) ** BigInt(decimals);
const budget = BigInt(20000000000) * decimalsVal;
const ticketPerToken = 1;
const processingCap = 110;
const winningChanceFactor = 3;
const errorOnlyAdmin = "Restricted to Admins.";
const LuniversetestActivate = false;// set true to enable Luniverse test


async function main(){
    var provider = new ethers.providers.JsonRpcProvider(luniversePRC);
    var owner = new ethers.Wallet(privateKey,provider);
    gluwaCoin = await new ethers.Contract(GluwaCoinAddress, abi.Token, owner);
    // console.log(owner.address);
    prizeLinkedAccountVault = await new ethers.Contract(PLSASandBoxAddress, abi.PLSA, owner);
    input = await prizeLinkedAccountVault.populateTransaction.initialize(owner.address, gluwaCoin.address, standardInterestRate,
      standardInterestRatePercentageBase, budget, ticketPerToken,
      cutOffHour, cutOffMinute, processingCap, winningChanceFactor, lowerLimitPercentage);

    receipt = await submitRawTxn(input, owner, ethers, provider);
    console.log(receipt)
    input = await prizeLinkedAccountVault.populateTransaction.addAdmin(operator);
    receipt = await submitRawTxn(input, owner, ethers, provider);
    input = await prizeLinkedAccountVault.populateTransaction.addOperator(operator);
    receipt = await submitRawTxn(input, owner, ethers, provider);
    input = await prizeLinkedAccountVault.populateTransaction.setPrizeLinkedAccountSettings(
        standardInterestRate,
      standardInterestRatePercentageBase, budget, ticketPerToken,1,
      cutOffHour, cutOffMinute, processingCap,winningChanceFactor, ticketRangeFactor, lowerLimitPercentage
      );
    res = await submitRawTxn(input, owner, ethers, provider);
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