const { ethers } = require("ethers");
const Tx = require('ethereumjs-tx').Transaction;
// const assert = require('assert');
// const BigNumber = require('big-number');

const abi = require('../test/LuniverseTest/abi');  
const privateKey = "";  

const luniversePRC = "http://baas-rpc.luniverse.io:8545?lChainId=1635501961136826136";

const logic="0x86daf51e790caf5f72f4591b8eba435c1d6e722d";//2.0
// const logic="0xb07cff4948464389750a96f5e97842307438982e";//1.9
const ProxyAdmin_Address="0x417fbbb84a2bd1cb0649be4ab45d9b907e629ae4";
// const ProxyAdmin_Address="0xA1BBc2aFF9f61c9fA94E40F04a195D450E0B5015";
const TransparentProxy_Address = "0x0856992bae46da73a2858437678e7da911853618";// sandbox
// const TransparentProxy_Address = "0x88d538741d95390b6f624120de85eea59caee1e0";// Test

// const TransparentProxy_Address = "0x444194906b130916a5e569f45a4f6d1f10c8ceaf";// unit test for myself
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
    console.log(plsa.address)
    input = await ProxyAdmin.connect(wallet).populateTransaction.upgrade(TransparentProxy_Address, logic);
    res = await txn(input, ProxyAdmin_Address);
    console.log(res)
    console.log(await ProxyAdmin.getProxyImplementation(TransparentProxy_Address));
    console.log(await plsa.getVersion());
}
run();

