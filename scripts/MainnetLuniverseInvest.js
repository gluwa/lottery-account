const { utils } = require('ethers');
const { hexZeroPad } = require('ethers/lib/utils');
const abi = require('../test/LuniverseTest/abi');
// const PLSASandBoxAddress = "0x3baa1012a0dff3ca03c959c479e0bee0c0c1806e";//mock staging proxy
// const PLSASandBoxAddress = "0xd69dbd8efd2df7a18265e3d708b7042414d30d64";//Staging proxy
const PLSASandBoxAddress = "0x4988fa8a091ca9ceba24daa0163d326d10b99a80";//PRD 
const operator = "***REMOVED***";
const privateKey = "";
// const privateKey = "";//PRD boosting fund address
const luniversePRC = "http://baas-rpc.luniverse.io:8545?lChainId=3158073271666164067";  
const GluwaCoinAddress = "0x39589FD5A1D4C7633142A178F2F2b30314FB2BaF";// Prod env
const target="0x61DE5445CB661c9a1059Cbe91098C3879c31a758";

async function main(){
    var provider = new ethers.providers.JsonRpcProvider(luniversePRC);
    var owner = new ethers.Wallet(privateKey,provider);
    gluwaCoin = await new ethers.Contract(GluwaCoinAddress, abi.Token, owner);
    prizeLinkedAccountVault = await new ethers.Contract(PLSASandBoxAddress, abi.PLSA, owner);
    input = await prizeLinkedAccountVault.populateTransaction.invest(target,BigInt(250000 * 10**6));
    res = await submitRawTxn(input, owner, ethers, provider);
    console.log(res)
    console.log(await gluwaCoin.balanceOf(prizeLinkedAccountVault.address))
    console.log(await gluwaCoin.balanceOf(target))

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