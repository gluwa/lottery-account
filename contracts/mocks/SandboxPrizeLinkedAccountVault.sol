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

    function makeDrawV1(uint256 drawTimeStamp, uint256 seed)
        external
        onlyOperator
        returns (uint256)
    {        
        bytes memory temp = new bytes(32);
        address sender = address(this);
        assembly {
            mstore(add(temp, 32), xor(seed, sender))
        }
        return _findDrawWinner(drawTimeStamp, temp);
    }


    function createPrizedLinkAccount(
        address owner,
        uint256 amount,
        uint256 dateTime,
        bytes calldata securityHash
    ) external onlyOperator returns (bool) {
        require(
            _token.transferFrom(owner, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to send amount to deposit to a Saving Account"
        );
        (, bytes32 depositHash) = _createSavingAccount(
            owner,
            amount,
            dateTime,
            securityHash
        );
        return _createPrizedLinkTickets(depositHash);
    }

    function depositPrizedLinkAccount(address owner, uint256 amount, uint256 dateTime)
        external
        onlyOperator
        returns (bool)
    {
        require(
            _token.transferFrom(owner, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to send amount to deposit to a Saving Account"
        );
        return _depositPrizedLinkAccount(owner, amount, dateTime, false);
    }

}
