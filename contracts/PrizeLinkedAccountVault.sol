pragma solidity ^0.5.0;

import "./abstracts/VaultControl.sol";
import "./abstracts/GluwacoinSavingAccount.sol";
import "./abstracts/GluwaPrizeDraw.sol";

contract PrizeLinkedAccountVault is
    VaultControl,
    GluwacoinSavingAccount,
    GluwaPrizeDraw
{
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
        __VaultControl_Init(admin);
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

    function prizeDraw(uint256 drawTimeStamp) external onlyOperator returns (bool) {
        DrawTicketModel.DrawTicket storage winningTicket = _findWinner(
            drawTimeStamp
        );
        uint256 prize = (
            _totalPrizeBroughForward.add(_currentTotalContractDeposit)
        ).mul(_standardInterestRate).div(_standardInterestRatePercentageBase);
        if (winningTicket.details > 0) {
            _totalPrizeBroughForward = 0;
            return _depositPrizedLinkAccount(winningTicket.owner, prize);
        } else {
            _totalPrizeBroughForward += prize;
            return true;
        }
    }

    function createPrizedLinkAccount(
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
        _totalTicketPerDeposit[depositHash] = amount
            .div(uint256(10)**uint256(_tokenDecimal))
            .div(_tokenPerTicket);
        return true;
    }

    function depositPrizedLinkAccount(address owner, uint256 amount)
        external onlyOperator
        returns (bool)
    {
        return _depositPrizedLinkAccount(owner, amount);
    }

    function _depositPrizedLinkAccount(address owner, uint256 amount)
        internal
        returns (bool)
    {
        bytes32 depositHash = _deposit(owner, amount);
        _totalTicketPerDeposit[depositHash] = amount
            .div(uint256(10)**uint256(_tokenDecimal))
            .div(_tokenPerTicket);
        return true;
    }

    function createPrizedLinkTickets(bytes32 referenceHash)
        external onlyOperator
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

    function getCurrentWinner() external view returns (uint256) {
        return _currentWinner;
    }

    function getSavingAcountFor(address owner)
        external onlyOperator
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
        external onlyOperator
        view
        returns (uint256[] memory)
    {
        return _getValidTicketId(owner);
    }

    function getTicketById(uint256 idx)
        external
        view
        returns (
            uint56,
            address,
            uint48,
            uint48,
            uint96,
            uint8
        )
    {
        return _getTicket(idx);
    }
}
