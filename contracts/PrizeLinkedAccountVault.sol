pragma solidity ^0.5.0;

import "./abstracts/VaultControl.sol";
import "./abstracts/GluwacoinSavingAccount.sol";
import "./abstracts/GluwaPrizeDraw.sol";
import "./libs/DateTimeModel.sol";

contract PrizeLinkedAccountVault is
    VaultControl,
    GluwacoinSavingAccount,
    GluwaPrizeDraw
{
    event Winner(address winner, uint256 ticket, uint256 reward);
    using DateTimeModel for DateTimeModel;

    uint8 internal _tokenDecimal;
    uint16 internal _tokenPerTicket;
    uint32 private _processingCap;

    function initialize(
        address admin,
        address tokenAddress,
        uint32 standardInterestRate,
        uint32 standardInterestRatePercentageBase,
        uint64 standardMaturityTerm,
        uint256 budget,
        uint16 tokenPerTicket,
        uint8 cutOffHour,
        uint8 cutOffMinute,
        uint32 processingCap,
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
            cutOffHour,
            cutOffMinute,
            ticketRangeFactor
        );
        _processingCap = processingCap;
        _tokenDecimal = _token.decimals();
        _tokenPerTicket = tokenPerTicket;
    }

    function awardWinnerV1(uint256 drawTimeStamp)
        external
        onlyOperator
        returns (bool)
    {
        require(
            !_prizePayingStatus[drawTimeStamp],
            "GluwaPrizeLinkedAccount: Prize has been paid out"
        );
        address winner = getDrawWinner(drawTimeStamp);
        uint256 prize = (
            _totalPrizeBroughForward.add(_balanceEachDraw[drawTimeStamp])
        ).mul(_standardInterestRate).div(_standardInterestRatePercentageBase);
        _prizePayingStatus[drawTimeStamp] = true;
        if (winner != address(0)) {
            _totalPrizeBroughForward = 0;
             _depositPrizedLinkAccount(winner, prize);
        } else {
            _totalPrizeBroughForward += prize;
        }
        return true;
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
        bytes calldata securityHash
    ) external onlyOperator returns (bool) {
        require(
            _token.transferFrom(owner, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to send amount to deposit to a Saving Account"
        );
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
        require(
            _token.transferFrom(owner, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to send amount to deposit to a Saving Account"
        );
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
            "GluwaPrizeLinkedAccount: The deposit is not found"
        );

        _createTicketForDeposit(
            deposit.owner,
            deposit.creationDate,
            deposit.amount,
            _convertDepositToTotalTicket(deposit.amount)
        );
        return true;
    }

    function withdrawFor(address owner, uint256 amount) external onlyOperator returns (bool) {
        return _withdrawPrizedLinkAccount(owner, amount);
    }

    function withdraw(uint256 amount) external returns (bool) {
        return _withdrawPrizedLinkAccount(_msgSender(), amount);
    }

    function _withdrawPrizedLinkAccount(address owner, uint256 amount)
        internal
        returns (bool)
    {
        uint256 newBalance = _withdraw(owner, amount);
        uint256 newIssued = _convertDepositToTotalTicket(newBalance);
        uint256 next2ndDraw = _calculateDrawTime(now);
        uint256 nextDraw = next2ndDraw - 86400;
        _removeTicket(owner, next2ndDraw, amount, newIssued);
        if (_drawParticipantTicket[nextDraw][owner].length > 0) {
            _removeTicket(owner, nextDraw, amount, newIssued);
        }
        return true;
    }

    function _convertDepositToTotalTicket(uint256 amount)
        private
        view
        returns (uint256)
    {
        return (amount * _tokenPerTicket) / (10**uint256(_tokenDecimal));
    }

    function getEligibleAddressPendingAddedToDraw(uint256 drawTimeStamp)
        external
        view
        returns (address[] memory result)
    {
        uint256 t;
        for (uint256 i = 0; i < _owners.length; i++) {
            if (
                _drawParticipantTicket[drawTimeStamp][_owners[i]].length == 0 &&
                _addressSavingAccountMapping[_owners[i]].balance > 0 &&
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
        for (uint256 i = 0; i < _owners.length; i++) {
            if (
                _drawParticipantTicket[drawTimeStamp][_owners[i]].length == 0 &&
                _addressSavingAccountMapping[_owners[i]].balance > 0 &&
                _addressSavingAccountMapping[_owners[i]].state ==
                GluwaAccountModel.AccountState.Active
            ) {
                _createTicket(
                    _owners[i],
                    drawTimeStamp,
                    _addressSavingAccountMapping[_owners[i]].balance,
                    _convertDepositToTotalTicket(
                        _addressSavingAccountMapping[_owners[i]].balance
                    )
                );
                processed++;
                if (processed > _processingCap) break;
            }
        }
        return processed;
    }

    function getSavingAcountFor(address owner)
        external
        view
        onlyOperator
        returns (
            uint256,
            bytes32,
            address,
            uint256,
            uint256,
            uint256,
            GluwaAccountModel.AccountState,
            bytes memory
        )
    {
        return _getSavingAccountFor(owner);
    }

    function getTicketRangeById(uint256 idx)
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
