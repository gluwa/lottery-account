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

    uint256 private _processingCap;

    function initialize(
        address admin,
        address tokenAddress,
        uint32 standardInterestRate,
        uint32 standardInterestRatePercentageBase,
        uint64 standardMaturityTerm,
        uint256 budget,
        uint16 tokenPerTicket,
        uint16 ticketValidityTargetBlock,
        uint32 processingCap
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
            ticketValidityTargetBlock
        );
        _processingCap = processingCap;
    }

    function prizeDraw(uint256 drawTimeStamp)
        external
        onlyOperator
        returns (bool)
    {
        require(
            !_prizePayingStatus[drawTimeStamp],
            "GluwaPrizeDraw: Prize has been paid out"
        );
        address[] storage winners = _drawWinningParticipant[drawTimeStamp];
        uint256 prize = (
            _totalPrizeBroughForward.add(_totalDepositEachDraw[drawTimeStamp])
        ).mul(_standardInterestRate).div(_standardInterestRatePercentageBase);
        _prizePayingStatus[drawTimeStamp] = true;
        if (winners.length > 0) {
            _totalPrizeBroughForward = 0;
            for (uint256 i = 0; i < winners.length; i++) {
                return _depositPrizedLinkAccount(winners[i], prize);
            }
        } else {
            _totalPrizeBroughForward += prize;
        }
        return true;
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
        return _createPrizedLinkTickets(depositHash);
    }

    function depositPrizedLinkAccount(address owner, uint256 amount)
        external
        onlyOperator
        returns (bool)
    {
        return _depositPrizedLinkAccount(owner, amount);
    }

    function _depositPrizedLinkAccount(address owner, uint256 amount)
        internal
        returns (bool)
    {
        bytes32 depositHash = _deposit(owner, amount, now);
        return _createPrizedLinkTickets(depositHash);
    }

    function _createPrizedLinkTickets(bytes32 referenceHash)
        internal
        onlyOperator
        returns (bool)
    {
        GluwaAccountModel.Deposit storage deposit = _depositStorage[
            referenceHash
        ];
        require(
            deposit.creationDate > 0,
            "GluwaPrizeDraw: The deposit is not found"
        );
        uint256 lower = uint256(deposit.owner) +
            uint256(_msgSender()) +
            _allTimeTotalContractDeposit;
        _createTicketForDeposit(
            deposit.owner,
            deposit.creationDate,
            lower + deposit.amount,
            lower
        );
        return true;
    }

    function getEligibleAddressPendingAddedToDraw(uint256 drawTimeStamp)
        external
        view
        returns (address[] memory result)
    {
        uint256 t;
        for (uint256 i = 0; i < _owners.length; i++) {
            if (
                _drawParticipantTicket[drawTimeStamp][_owners[i]] == 0 &&
                _addressSavingAccountMapping[_owners[i]].totalDeposit > 0 &&
                _addressSavingAccountMapping[_owners[i]].state ==
                GluwaAccountModel.AccountState.Active
            ) {
                result[t] = _owners[i];
                t++;
            }
        }
    }

    function regenerateTicketForNextDraw(uint256 drawTimeStamp)
        external
        returns (uint256)
    {
        uint256 processed;
         uint256 base = uint256(_msgSender()) +
            _allTimeTotalContractDeposit;
        for (uint256 i = 0; i < _owners.length; i++) {
            if (
                   _drawParticipantTicket[drawTimeStamp][_owners[i]] == 0 &&
                _addressSavingAccountMapping[_owners[i]].totalDeposit > 0 &&
                _addressSavingAccountMapping[_owners[i]].state ==
                GluwaAccountModel.AccountState.Active
            ) {
                _createTicket(
                    _owners[i],
                    drawTimeStamp,
                    uint256(_owners[i]) + base +
                        _addressSavingAccountMapping[_owners[i]].totalDeposit,
                    uint256(_owners[i]) + base
                );
                processed++;
                if (processed > _processingCap) break;
            }
        }
        return processed;
    }

    function getCurrentWinner() external view returns (uint256) {
        return _currentWinner;
    }

    function getSavingAcountFor(address owner)
        external
        view
        onlyOperator
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
        onlyOperator
        returns (uint256[] memory)
    {
        return _getValidTicketId(owner);
    }

    function getTicketById(uint256 idx)
        external
        view
        returns (
            uint96,
            address,
            uint256,
            uint256            
        )
    {
        return _getTicket(idx);
    }
}
