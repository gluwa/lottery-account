pragma solidity ^0.5.0;

import "../PrizeLinkedAccountVault.sol";

contract SandboxPrizeLinkedAccountVault is PrizeLinkedAccountVault {   

    function makeDrawV1_Dummy(uint256 drawTimeStamp, uint256 seed)
        external
        onlyOperator
        returns (uint256)
    {
         _drawWinner[drawTimeStamp] = seed;
        return seed;
    }

}
