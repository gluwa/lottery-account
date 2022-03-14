pragma solidity ^0.5.0;

import "../abstracts/VaultControl.sol";
import "./GluwacoinSavingAccountNoLib.sol";
import "./GluwaPrizeDrawNoLib.sol";

contract PrizeLinkedAccountVaultLuniverse is
    VaultControl,
    GluwacoinSavingAccountNoLib,
    GluwaPrizeDrawNoLib
{
    event WinnerSelected(address winner, uint256 reward);
    event Invested(address indexed recipient, uint256 amount);
    uint8 internal _lowerLimitPercentage;
    uint8 internal _tokenDecimal;
    uint16 private _processingCap;
    uint64 private _ticketPerToken;
    uint256 private _boostingFund;

    function initialize(
        address admin,
        address tokenAddress,
        uint32 standardInterestRate,
        uint32 standardInterestRatePercentageBase,
        uint256 budget,
        uint64 ticketPerToken,
        uint8 cutOffHour,
        uint8 cutOffMinute,
        uint16 processingCap,
        uint128 ticketRangeFactor,
        uint8 lowerLimitPercentage
    ) external initializer {
        __VaultControl_Init(admin);
        __GluwacoinSavingAccount_init_unchained(
            tokenAddress,
            standardInterestRate,
            standardInterestRatePercentageBase,
            budget
        );
        __GluwaPrizeDraw_init_unchained(
            cutOffHour,
            cutOffMinute,
            ticketRangeFactor
        );
        _processingCap = processingCap;
        _tokenDecimal = _token.decimals();
        _ticketPerToken = ticketPerToken;
        _lowerLimitPercentage = lowerLimitPercentage;
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
            _totalPrizeBroughForward.add(_boostingFund).add(
                _balanceEachDraw[drawTimeStamp]
            )
        ).mul(_standardInterestRate).div(_standardInterestRatePercentageBase);
        _prizePayingStatus[drawTimeStamp] = true;
        if (winner != address(0)) {
            _totalPrizeBroughForward = 0;
            _depositPrizedLinkAccount(winner, prize, now, true);
        } else {
            _totalPrizeBroughForward += prize;
        }
        emit WinnerSelected(winner, prize);
        return true;
    }

    function makeDrawV1(uint256 drawTimeStamp, uint256 seed)
        external
        onlyOperator
        returns (uint256)
    {
        require(
            drawTimeStamp <= now,
            "GluwaPrizeLinkedAccount: The draw can only be made on or after the draw date time"
        );
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
        return _depositPrizedLinkAccount(owner, amount, now, false);
    }

    function _depositPrizedLinkAccount(
        address owner,
        uint256 amount,
        uint256 dateTime,
        bool isEarning
    ) internal returns (bool) {
        bytes32 depositHash = _deposit(owner, amount, dateTime, isEarning);
        return _createPrizedLinkTickets(depositHash);
    }

    function _createPrizedLinkTickets(bytes32 referenceHash)
        internal
        onlyOperator
        returns (bool)
    {
        Deposit storage deposit = _depositStorage[
            referenceHash
        ];
        require(
            deposit.creationDate > 0,
            "GluwaPrizeLinkedAccount: The deposit is not found"
        );
        uint256 next2ndDraw = _calculateDrawTime(deposit.creationDate);

        if (_drawParticipantTicket[next2ndDraw][deposit.owner].length == 0) {
            _createTicketForDeposit(
                deposit.owner,
                deposit.creationDate,
                _addressSavingAccountMapping[deposit.owner].balance,
                _convertDepositToTotalTicket(deposit.amount)
            );
        } else {
            _createTicketForDeposit(
                deposit.owner,
                deposit.creationDate,
                deposit.amount,
                _convertDepositToTotalTicket(deposit.amount)
            );
        }
        return true;
    }

    function withdrawFor(address owner, uint256 amount)
        external
        onlyOperator
        returns (bool)
    {
        return _withdrawPrizedLinkAccount(owner, owner, amount);
    }

    function withdraw(uint256 amount) external returns (bool) {
        return _withdrawPrizedLinkAccount(_msgSender(), _msgSender(), amount);
    }

    function withdrawUnclaimedAccount(address owner, address recipient)
        external
        onlyAdmin
        returns (bool)
    {
        return
            _withdrawPrizedLinkAccount(
                owner,
                recipient,
                _addressSavingAccountMapping[owner].balance
            );
    }

    function _withdrawPrizedLinkAccount(
        address owner,
        address recipient,
        uint256 amount
    ) internal returns (bool) {
        _withdraw(owner, recipient, amount);
        uint256 newIssued = _convertDepositToTotalTicket(amount);
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
        return (amount * _ticketPerToken) / (10**uint256(_tokenDecimal));
    }

    function getEligibleAddressPendingAddedToDraw(uint256 drawTimeStamp)
        external
        view
        returns (address[] memory result)
    {
        uint256 t;
        uint256 i;
        address[] storage previousDrawParticipants = _drawParticipant[
            drawTimeStamp - 86400
        ];
        result = new address[](previousDrawParticipants.length);
        for (i = 0; i < previousDrawParticipants.length; i++) {
            if (
                _drawParticipantTicket[drawTimeStamp][
                    previousDrawParticipants[i]
                ].length ==
                0 &&
                _addressSavingAccountMapping[previousDrawParticipants[i]]
                    .balance >
                0 &&
                _addressSavingAccountMapping[previousDrawParticipants[i]]
                    .state ==
                AccountState.Active
            ) {
                result[t] = previousDrawParticipants[i];
                t++;
            }
        }
        uint256 unusedSpace = i - t;
        assembly {
            mstore(result, sub(mload(result), unusedSpace))
        }
    }

    function regenerateTicketForNextDraw(uint256 drawTimeStamp)
        external onlyOperator
        returns (uint256)
    {
        uint32 processed;
        address[] storage previousDrawParticipants = _drawParticipant[
            drawTimeStamp - 86400
        ];

        for (uint256 i = 0; i < previousDrawParticipants.length; i++) {
            if (
                _drawParticipantTicket[drawTimeStamp][
                    previousDrawParticipants[i]
                ].length ==
                0 &&
                _addressSavingAccountMapping[previousDrawParticipants[i]]
                    .balance >
                0 &&
                _addressSavingAccountMapping[previousDrawParticipants[i]]
                    .state ==
                AccountState.Active
            ) {
                _createTicket(
                    previousDrawParticipants[i],
                    drawTimeStamp,
                    _addressSavingAccountMapping[previousDrawParticipants[i]]
                        .balance,
                    _convertDepositToTotalTicket(
                        _addressSavingAccountMapping[
                            previousDrawParticipants[i]
                        ].balance
                    )
                );
                processed++;
                if (processed >= _processingCap) break;
            }
        }
        return processed;
    }

    function invest(address recipient, uint256 amount)
        external
        onlyOperator
        returns (bool)
    {
        require(
            recipient != address(0),
            "GluwaPrizeLinkedAccount: Recipient address for investment must be defined."
        );
        uint256 totalBalance = _token.balanceOf(address(this));
        require(
            totalBalance - amount >=
                totalBalance.mul(_lowerLimitPercentage).div(100) ||
                _totalDeposit == 0,
            "GluwaPrizeLinkedAccount: the investment amount will make the total balance lower than the bottom threshold."
        );
        _token.transfer(recipient, amount);
        emit Invested(recipient, amount);
        return true;
    }

    function addBoostingFund(address source, uint256 amount)
        external
        onlyOperator
        returns (bool)
    {
        require(
            _token.transferFrom(source, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to get the boosting fund from source"
        );
        _boostingFund = _boostingFund.add(amount);
        return true;
    }

    function withdrawBoostingFund(address recipient, uint256 amount)
        external
        onlyOperator
        returns (bool)
    {
        _boostingFund = _boostingFund.sub(amount);
        _token.transfer(recipient, amount);
        return true;
    }

    function getBoostingFund() external view returns (uint256) {
        return _boostingFund;
    }

    function setPrizeLinkedAccountSettings(
        uint32 standardInterestRate,
        uint32 standardInterestRatePercentageBase,
        uint256 budget,
        uint256 minimumDeposit,
        uint64 ticketPerToken,
        uint8 cutOffHour,
        uint8 cutOffMinute,
        uint16 processingCap,
        uint128 ticketRangeFactor,
        uint8 lowerLimitPercentage
    ) external onlyOperator {
        _ticketPerToken = ticketPerToken;
        _processingCap = processingCap;
        _lowerLimitPercentage = lowerLimitPercentage;
        _setAccountSavingSettings(
            standardInterestRate,
            standardInterestRatePercentageBase,
            budget,
            minimumDeposit
        );
        _setGluwaPrizeDrawSettings(cutOffHour, cutOffMinute, ticketRangeFactor);
    }

    function getPrizeLinkedAccountSettings()
        external
        view
        returns (
            uint32 standardInterestRate,
            uint32 standardInterestRatePercentageBase,
            uint256 budget,
            uint256 minimumDeposit,
            IERC20 token,
            uint64 ticketPerToken,
            uint8 cutOffHour,
            uint8 cutOffMinute,
            uint16 processingCap,
            uint128 ticketRangeFactor,
            uint8 lowerLimitPercentage
        )
    {
        ticketPerToken = _ticketPerToken;
        processingCap = _processingCap;
        lowerLimitPercentage = _lowerLimitPercentage;
        (
            standardInterestRate,
            standardInterestRatePercentageBase,
            budget,
            minimumDeposit,
            token
        ) = getSavingSettings();

        (
            cutOffHour,
            cutOffMinute,
            ticketRangeFactor
        ) = _getGluwaPrizeDrawSettings();
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
            AccountState,
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

    function getTickerIdsByOwnerAndDraw(uint256 drawTimeStamp)
        external
        view
        returns (uint96[] memory)
    {
        return _getTickerIdsByOwnerAndDraw(drawTimeStamp, _msgSender());
    }

    function getTickerIdsByOwnerAndDrawFor(uint256 drawTimeStamp, address owner)
        external
        view
        onlyOperator
        returns (uint96[] memory)
    {
        return _getTickerIdsByOwnerAndDraw(drawTimeStamp, owner);
    }

    uint256[50] private __gap;
}