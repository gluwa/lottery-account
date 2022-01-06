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

    uint8 internal _blockNumberFactor; // 1st Factor to ensure the chance 2 userss tickets in a draw overlapping each other is very low
    uint32 private _processingCap;
    uint128 internal _ticketRangeFactor; // 2nd Factor to ensure the chance 2 userss tickets in a draw overlapping each other is very low

    function initialize(
        address admin,
        address tokenAddress,
        uint32 standardInterestRate,
        uint32 standardInterestRatePercentageBase,
        uint64 standardMaturityTerm,
        uint256 budget,
        uint16 tokenPerTicket,
        uint16 ticketValidityTargetBlock,
        uint32 processingCap,
        uint8 blockNumberFactor,
        uint128 ticketRangeFactor
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
        _ticketRangeFactor = ticketRangeFactor;
        _blockNumberFactor = blockNumberFactor;
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

    function findDrawWinnerV1(uint256 drawTimeStamp, uint256 seed)
        external
        onlyOperator
        returns (uint256)
    {
        bytes memory temp = new bytes(32);
        address sender = address(this);
        assembly {
            mstore(add(temp, 32), xor(seed,sender))
        }
        return _findDrawWinner(drawTimeStamp, temp);
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
        uint256 lower = _ticketRangeFactor +
            block.number *
            _blockNumberFactor +
            _allTimeTotalContractDeposit;
        _createTicketForDeposit(
            deposit.owner,
            deposit.creationDate,
            lower,
            lower + _convertDepositToTotalTicket(deposit.amount)
        );
        return true;
    }

    function _convertDepositToTotalTicket(uint256 amount)
        private
        view
        returns (uint256)
    {
        return (amount * _tokenPerTicket) / (10**uint256(_token.decimals()));
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
        uint32 processed;
        uint256 base = block.number *
            _blockNumberFactor +
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
                    _ticketRangeFactor * processed + base,
                    _ticketRangeFactor *
                        processed +
                        base +
                        _convertDepositToTotalTicket(
                            _addressSavingAccountMapping[_owners[i]]
                                .totalDeposit
                        )
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
