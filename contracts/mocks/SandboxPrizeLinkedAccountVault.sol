pragma solidity ^0.5.0;

import "../PrizeLinkedAccountVault.sol";

contract SandboxPrizeLinkedAccountVault is PrizeLinkedAccountVault {

    event DrawResult(uint256 indexed drawTimeStamp, uint256 winningTicket);

    function makeDrawV1_Dummy(uint256 drawTimeStamp, uint256 seed)
        external
        onlyOperator
        returns (uint256)
    {
         _drawWinner[drawTimeStamp] = seed;
        emit DrawResult(drawTimeStamp, seed);
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
        uint256 drawWinner = _findDrawWinner(drawTimeStamp, temp);
        emit DrawResult(drawTimeStamp, drawWinner);
        return drawWinner;
    }


    function createPrizedLinkAccount(
        address owner,
        uint256 amount,
        uint256 dateTime,
        bytes calldata securityHash
    ) external onlyOperator returns (bool) {
        (, bytes32 depositHash) = _createSavingAccount(
            owner,
            amount,
            dateTime,
            securityHash
        );
        bool createTicker = _createPrizedLinkTickets(depositHash);
        require(
            _token.transferFrom(owner, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to send amount to deposit to a Saving Account"
        );
        return createTicker;
    }

    function getBalanceEachDraw(uint256 drawTimeStamp) external view returns (uint256) {
        return _balanceEachDraw[drawTimeStamp];
    }

    function getRemovedTicketsEachDraw(uint256 drawTimeStamp) external view returns (uint256) {
        return _removedTicketsEachDraw[drawTimeStamp];
    }

    function createPrizedLinkAccountDummy(
        address owner,
        uint256 amount,
        bytes calldata securityHash
    ) external onlyOperator returns (bool) {
        (, bytes32 depositHash) = _createSavingAccount(
            owner,
            amount,
            now,
            securityHash
        );
        bool createTicker = _createPrizedLinkTickets(depositHash);
        require(
            _token.transferFrom(owner, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to send amount to deposit to a Saving Account"
        );
        return createTicker;
    }
    function depositPrizedLinkAccount(address owner, uint256 amount, uint256 dateTime)
        external
        onlyOperator
        returns (bool)
    {
        bool createDeposit = _depositPrizedLinkAccount(owner, amount, dateTime, false);
        require(
            _token.transferFrom(owner, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to send amount to deposit to a Saving Account"
        );
        return createDeposit;
    }

}
