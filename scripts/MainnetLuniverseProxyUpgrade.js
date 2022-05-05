const { ethers } = require("ethers");
const Tx = require('ethereumjs-tx').Transaction;
// const assert = require('assert');
// const BigNumber = require('big-number');

const abi = require('../test/LuniverseTest/abi');  
const privateKey = "";  

const luniversePRC = "http://baas-rpc.luniverse.io:8545?lChainId=3158073271666164067";
// const logic="0x21fbcc4fa6f18be3cc843f58d6e6e5d95e3d6059";//1.9
const logic="0x0b6fcf573c97f668202f9bb87965092fe6be0575";//2.0
const ProxyAdmin_Address="0xf52067c6af8c7fbd2ab3120a7f25710aae2fca27";//PRD admin
const TransparentProxy_Address="0x4988fa8a091ca9ceba24daa0163d326d10b99a80";//PRD
// const ProxyAdmin_Address="0x12ce136a75d8e98ce4640e43d30a45cb68744dda";//staging admin
// const TransparentProxy_Address="0xd69dbd8efd2df7a18265e3d708b7042414d30d64";//Staging proxy
var provider = new ethers.providers.JsonRpcProvider(luniversePRC);
var wallet = new ethers.Wallet(privateKey,provider);

async function txn(_input, _to){
        const txCount = await provider.getTransactionCount(wallet.address);
        var rawTx = {
                nonce: ethers.utils.hexlify(txCount),
                to: _to,
                value: 0x00,
                gasLimit: ethers.utils.hexlify(1950000),
                gasPrice: ethers.utils.hexlify(23810000000000),
                data: _input.data
                };
        const tx = new Tx(rawTx); 
        const rawTransactionHex = await wallet.signTransaction(rawTx);
        const { hash } = await provider.sendTransaction(rawTransactionHex);
        return await provider.waitForTransaction(hash);
}
async function run(){
    var provider = new ethers.providers.JsonRpcProvider(luniversePRC);
    var wallet = new ethers.Wallet(privateKey,provider);

    var ProxyAdmin = await new ethers.Contract(ProxyAdmin_Address, abi.ProxyAdmin, wallet);
    var plsa = await new ethers.Contract(TransparentProxy_Address, abi.PLSA, wallet);
    input = await ProxyAdmin.connect(wallet).populateTransaction.upgrade(TransparentProxy_Address, logic);
    res = await txn(input, ProxyAdmin_Address);
    console.log(res)
    console.log(await ProxyAdmin.getProxyImplementation(TransparentProxy_Address));
    console.log(await plsa.getVersion());
} 
run();
