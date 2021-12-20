pragma solidity ^0.5.0;

import "./abstracts/GluwacoinSavingAccount.sol";
import "./abstracts/GluwaPrizeDraw.sol";

contract PrizeLinkedAccountVault is GluwacoinSavingAccount, GluwaPrizeDraw {
    event Winner(address winner, uint256 ticket, uint256 reward);

    function initialize(
        address admin,
        address tokenAddress,
        uint32 standardInterestRate,
        uint32 standardInterestRatePercentageBase,
        uint64 standardMaturityTerm,
        uint256 budget,
        uint16 tokenPerTicket,
        uint16 ticketValidityTargetBlock,
        uint32 totalTicketPerBatch
    ) external initializer {
        __GluwacoinSavingAccount_init_unchained(
            tokenAddress,
            standardInterestRate,
            standardInterestRatePercentageBase,
            standardMaturityTerm,
            budget
        );
        __GluwaPrizeDraw_init_unchained(
            _token.decimals(),
            tokenPerTicket,
            ticketValidityTargetBlock,
            totalTicketPerBatch
        );
    }

    function createPrizedLinkAccount(
        address owner,
        uint256 amount,
        bytes calldata securityHash
    ) external returns (bool) {
        (, bytes32 depositHash) = _createSavingAccount(
            owner,
            amount,
            now,
            securityHash
        );
        _totalTicketPerDeposit[depositHash] = amount
            .div(uint256(10)**uint256(_tokenDecimal))
            .div(_tokenPerTicket);
        return true;
    }

    function createPrizedLinkTickets(bytes32 referenceHash)
        external
        returns (bool)
    {
        GluwaAccountModel.Deposit storage deposit = _depositStorage[
            referenceHash
        ];
        _createTicketForDeposit(
            deposit.owner,
            deposit.creationDate,
            referenceHash
        );
        return true;
    }

    function deposit(
        address owner,
        uint256 amount,
        bytes calldata securityHash
    ) external returns (bool) {
        // _createSavingAccount(owner, amount, now, securityHash);
        // _createTicketForDeposit(owner, amount);
        return true;
    }

    function prizeDraw(uint256 drawDateTime)
        external
        returns (
            uint256,
            address,
            uint256,
            uint256,
            uint256,
            DrawTicketModel.DrawTicketState state
        )
    {
        DrawTicketModel.DrawTicket storage winner = _findWinner(drawDateTime);
        return (
            winner.idx,
            winner.owner,
            winner.creationDate,
            winner.drawnDate,
            winner.targetBlockNumber,
            winner.state
        );
    }

    function getCurrentWinner() external returns (uint256) {
        return _currentWinner;
    }

    function getSavingAcountFor(address owner)
        external
        view
        returns (
            uint256,
            bytes32,
            address,
            uint32,
            uint32,
            uint256,
            uint256,
            uint256,
            GluwaAccountModel.AccountState,
            bytes memory
        )
    {
        return _getSavingAccountFor(owner);
    }

    function getValidTicketIdFor(address owner)
        external
        view
        returns (uint256[] memory)
    {
        return _getValidTicketId(owner);
    }

    function getTicketById(uint256 idx)
        external
        view
        returns (
            uint256,
            address,
            uint256,
            uint256,
            uint256,
            DrawTicketModel.DrawTicketState
        )
    {
        return _getTicket(idx);
    }   
}
