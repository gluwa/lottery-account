pragma solidity ^0.5.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "../libs/DrawTicketModel.sol";
import "../libs/SimpleIndex.sol";
import "../libs/UintArrayUtil.sol";
// import "../libs/DateTimeModel.sol";
contract GluwaPrizeDrawNoLib is Initializable, Context {
    uint256 public constant YEAR_IN_SECOND = 31536000;
    uint256 public constant LEAP_YEAR_IN_SECOND = 31622400;
    uint256 public constant DAY_IN_SECOND = 86400;
    uint256 public constant HOUR_IN_SECOND = 3600;
    uint256 public constant MINUTE_IN_SECOND = 60;

    uint16 public constant START_YEAR = 1970;

    using SafeMath for uint256;

    using UintArrayUtil for uint256[];
    using SimpleIndex for SimpleIndex.Index;
    struct DateTime {
        uint16 year;
        uint8 month;
        uint8 day;
        uint8 hour;
        uint8 minute;
        uint8 second;
    }
    //IDepositableAccount private _depositContract;
    SimpleIndex.Index private _drawTicketIndex;
    uint8 internal _cutOffHour; //Hour 0-23, to ensure 24 hour before the drawdate
    uint8 internal _cutOffMinute; //Minute 0-59, to ensure 24 hour before the drawdate
    uint128 internal _ticketRangeFactor; // Factor to ensure the chance 2 userss tickets in a draw overlapping each other is very low
    uint256 internal _totalPrizeBroughForward;
    mapping(uint256 => DrawTicketModel.DrawTicket) internal _tickets;
    mapping(uint256 => uint96[]) internal _drawTicketMapping;
    mapping(uint256 => uint256) internal _drawTicketCurrentUpper;
    mapping(uint256 => mapping(address => uint96[]))
        internal _drawParticipantTicket;
    mapping(uint256 => mapping(address => uint256))
        internal _drawParticipantDeposit;
    mapping(uint256 => address[]) internal _drawParticipant;
    mapping(uint256 => uint256) internal _drawWinner;
    mapping(uint256 => uint256) internal _balanceEachDraw;
    mapping(uint256 => bool) internal _prizePayingStatus;

    event TicketCreated(
        uint256 indexed drawTimeStamp,
        uint256 indexed ticketId,
        address indexed owner,
        uint256 upper,
        uint256 lower
    );

    function __GluwaPrizeDraw_init_unchained(
        uint8 cutOffHour,
        uint8 cutOffMinute,
        uint128 ticketRangeFactor
    ) internal initializer {
        _cutOffHour = cutOffHour;
        _cutOffMinute = cutOffMinute;
        _ticketRangeFactor = ticketRangeFactor;
        _drawTicketIndex = SimpleIndex.Index({nextIdx: 1});
    }

    function _setGluwaPrizeDrawSettings(
        uint8 cutOffHour,
        uint8 cutOffMinute,
        uint128 ticketRangeFactor
    ) internal {
        _cutOffHour = cutOffHour;
        _cutOffMinute = cutOffMinute;
        _ticketRangeFactor = ticketRangeFactor;
    }

    function _getGluwaPrizeDrawSettings()
        internal
        view
        returns (
            uint8,
            uint8,
            uint128
        )
    {
        return (_cutOffHour, _cutOffMinute, _ticketRangeFactor);
    }

    function _randomNumber(
        uint256 min,
        uint256 max,
        bytes memory externalFactor
    ) public view returns (uint256) {
        uint256 random = (uint256(
            keccak256(
                abi.encodePacked(
                    now,
                    externalFactor,
                    blockhash(block.number),
                    block.timestamp,
                    block.difficulty,
                    max,
                    min
                )
            )
        ) % (max - min + 1)) + min;
        return random;
    }

    function findMinMaxForDraw(uint256 drawTimeStamp)
        public
        view
        returns (uint256 min, uint256 max)
    {
        uint96[] storage drawTickets = _drawTicketMapping[drawTimeStamp];
        max = _tickets[drawTickets[drawTickets.length - 1]].upper;
        min = _tickets[drawTickets[0]].lower;
    }
     function _findDrawWinner_Dummy(uint256 drawTimeStamp, bytes memory externalFactor)
        internal
        returns (uint256)
    {
        // require(
        //     _drawWinner[drawTimeStamp] == 0,
        //     "GluwaPrizeDraw: the draw has been made"
        // );
        (uint256 min, uint256 max) = findMinMaxForDraw(drawTimeStamp);
        _drawWinner[drawTimeStamp] = _randomNumber(min, max, externalFactor);
        return _drawWinner[drawTimeStamp];
    }
    function _findDrawWinner(uint256 drawTimeStamp, bytes memory externalFactor)
        public
        returns (uint256)
    {
        require(
            _drawWinner[drawTimeStamp] == 0,
            "GluwaPrizeDraw: the draw has been made"
        );
        (uint256 min, uint256 max) = findMinMaxForDraw(drawTimeStamp);
        _drawWinner[drawTimeStamp] = _randomNumber(min, max, externalFactor);
        return _drawWinner[drawTimeStamp];
    }

    function getDrawWinner(uint256 drawTimeStamp)
        public
        view
        returns (address result)
    {
        require(
            _drawWinner[drawTimeStamp] > 0,
            "GluwaPrizeDraw: the draw has not been made"
        );
        for (uint256 i = 0; i < _drawTicketMapping[drawTimeStamp].length; i++) {
            if (
                _tickets[_drawTicketMapping[drawTimeStamp][i]].upper >
                _tickets[_drawTicketMapping[drawTimeStamp][i]].lower &&
                _tickets[_drawTicketMapping[drawTimeStamp][i]].upper >=
                _drawWinner[drawTimeStamp] &&
                _tickets[_drawTicketMapping[drawTimeStamp][i]].lower <=
                _drawWinner[drawTimeStamp]
            ) {
                (, result) = _getTicketIdentifierDetails(
                    _tickets[_drawTicketMapping[drawTimeStamp][i]].identifier
                );
                break;
            }
        }
    }

    function _calculateDrawTime(uint256 txnTimeStamp)
        public
        view
        returns (uint256 drawTimeStamp)
    {
        DateTime memory drawDateTime = toDateTime(
            txnTimeStamp
        );
        uint8 nextDrawDay = 2;
        if (
            drawDateTime.hour < _cutOffHour ||
            (drawDateTime.hour == _cutOffHour &&
                drawDateTime.minute <= _cutOffMinute)
        ) {
            nextDrawDay = 1;
        }
        uint8 daysInMonth = getDaysInMonth(
            drawDateTime.month,
            drawDateTime.year
        );
        if (nextDrawDay + drawDateTime.day > daysInMonth) {
            if (drawDateTime.month != 12) {
                drawDateTime.month += 1;
            } else {
                drawDateTime.year += 1;
                drawDateTime.month = 1;
            }
            drawDateTime.day = nextDrawDay + drawDateTime.day - daysInMonth;
        } else {
            drawDateTime.day = nextDrawDay + drawDateTime.day;
        }
        if (_cutOffMinute == 59) {
            drawDateTime.hour = _cutOffHour + 1;
            drawDateTime.minute = 0;
        } else {
            drawDateTime.hour = _cutOffHour;
            drawDateTime.minute = _cutOffMinute + 1;
        }

        drawDateTime.second = 0;
        drawTimeStamp = toTimeStamp(
            drawDateTime.year,
            drawDateTime.month,
            drawDateTime.day,
            drawDateTime.hour,
            drawDateTime.minute,
            drawDateTime.second
        );
    }

    function _createTicketForDeposit(
        address owner_,
        uint256 depositTimeStamp,
        uint256 depositAmount,
        uint256 issuedTicket
    ) internal returns (bool) {
        return
            _createTicket(
                owner_,
                _calculateDrawTime(depositTimeStamp),
                depositAmount,
                issuedTicket
            );
    }

    function _createTicket(
        address owner_,
        uint256 drawTimeStamp,
        uint256 depositAmount,
        uint256 issuedTicket
    ) internal returns (bool) {
        uint96 ticketId = _drawTicketIndex.nextIdx;
        uint256 identifier_ = uint256(owner_);
        identifier_ |= uint256(ticketId) << 160;
        uint256 ticketLower = _ticketRangeFactor +
            _drawTicketCurrentUpper[drawTimeStamp];
        uint256 ticketUpper = ticketLower + issuedTicket;
        _tickets[ticketId] = DrawTicketModel.DrawTicket({
            identifier: identifier_,
            lower: ticketLower,
            upper: ticketUpper
        });
        _balanceEachDraw[drawTimeStamp] += depositAmount;
        _drawParticipantDeposit[drawTimeStamp][owner_] += depositAmount;
        _drawParticipant[drawTimeStamp].push(owner_);
        _drawParticipantTicket[drawTimeStamp][owner_].push(
            _drawTicketIndex.nextIdx
        );
        _drawTicketMapping[drawTimeStamp].push(ticketId);
        _drawTicketCurrentUpper[drawTimeStamp] = ticketUpper;
        emit TicketCreated(
            drawTimeStamp,
            ticketId,
            owner_,
            ticketLower,
            ticketUpper
        );
        _drawTicketIndex.add();
        return true;
    }

    function _removeTicket(
        address owner_,
        uint256 drawTimeStamp,
        uint256 amount,
        uint256 ticketsToRemove
    ) internal returns (bool) {
        if (_drawParticipantTicket[drawTimeStamp][owner_].length > 0) {
            uint256 issuedTickets;
            for (
                uint256 i = 0;
                i < _drawParticipantTicket[drawTimeStamp][owner_].length;
                i++
            ) {
                issuedTickets =
                    _tickets[_drawParticipantTicket[drawTimeStamp][owner_][i]]
                        .upper -
                    _tickets[_drawParticipantTicket[drawTimeStamp][owner_][i]]
                        .lower;
                if (ticketsToRemove > issuedTickets) {
                    ticketsToRemove = ticketsToRemove - issuedTickets;
                    _tickets[_drawParticipantTicket[drawTimeStamp][owner_][i]]
                        .upper = _tickets[
                        _drawParticipantTicket[drawTimeStamp][owner_][i]
                    ].lower;
                } else {
                    _tickets[_drawParticipantTicket[drawTimeStamp][owner_][i]]
                        .upper -= ticketsToRemove;
                    break;
                }
            }
            if (amount > _drawParticipantDeposit[drawTimeStamp][owner_]) {
                _drawParticipantDeposit[drawTimeStamp][owner_] = 0;
                _balanceEachDraw[drawTimeStamp] -= _drawParticipantDeposit[
                    drawTimeStamp
                ][owner_];
            } else {
                _drawParticipantDeposit[drawTimeStamp][owner_] -= amount;
                _balanceEachDraw[drawTimeStamp] -= amount;
            }
        }
        return true;
    }

    function _getTicket(uint256 idx)
        internal
        view
        returns (
            uint96 ticketId,
            address owner,
            uint256 lower,
            uint256 upper
        )
    {
        DrawTicketModel.DrawTicket storage ticket = _tickets[idx];
        (ticketId, owner) = _getTicketIdentifierDetails(ticket.identifier);
        lower = ticket.lower;
        upper = ticket.upper;
    }

    function _getTicketIdentifierDetails(uint256 details)
        internal
        pure
        returns (uint96 ticketId, address owner)
    {
        owner = address(details);
        ticketId = uint96(details >> 160);
    }

    function _getTickerIdsByOwnerAndDraw(uint256 drawTimeStamp, address owner)
        internal view
        returns (uint96[] memory)
    {
        return _drawParticipantTicket[drawTimeStamp][owner];
    }

    function getDrawDetails(uint256 drawTimeStamp)
        public
        view
        returns (
            address[] memory participants,
            uint96[] memory ticketIds,
            uint256 winningTicket,
            uint256 balanceEachDraw
        )
    {
        participants = _drawParticipant[drawTimeStamp];
        ticketIds = _drawTicketMapping[drawTimeStamp];
        winningTicket = _drawWinner[drawTimeStamp];
        balanceEachDraw = _balanceEachDraw[drawTimeStamp];
    }

    function getAmountBroughtToNextDraw() public view returns (uint256) {
        return _totalPrizeBroughForward;
    }
    function isLeapYear(uint256 year) public pure returns (bool) {
        return year % 400 == 0 || (year % 4 == 0 && year % 100 != 0);
    }

    /// @dev a year is a leap year if:
    /// - It is divisible by 4
    /// - Years that are divisible by 100 cannot be a leap year unless they are also divisible by 400
    function getTotalLeapYearBefore(uint256 year) public pure returns (uint16) {
        year -= 1;
        return uint16(year / 4 + year / 400 - year / 100);
    }

    function getYear(uint256 timeStamp) public pure returns (uint16) {
        uint256 year = START_YEAR + timeStamp / YEAR_IN_SECOND;
        uint256 totalLeapYears = getTotalLeapYearBefore(year) -
            getTotalLeapYearBefore(START_YEAR);

        uint256 totalSeconds = YEAR_IN_SECOND *
            (year - START_YEAR - totalLeapYears) +
            LEAP_YEAR_IN_SECOND *
            totalLeapYears;

        while (totalSeconds > timeStamp) {
            if (isLeapYear(year - 1)) {
                totalSeconds -= LEAP_YEAR_IN_SECOND;
            } else {
                totalSeconds -= YEAR_IN_SECOND;
            }
            year -= 1;
        }
        return uint16(year);
    }

    function getDaysInMonth(uint8 month, uint256 year)
        public
        pure
        returns (uint8)
    {
        if (month == 2) {
            if (isLeapYear(year)) return 29;
            return 28;
        } else if (month == 4 || month == 6 || month == 9 || month == 11) {
            return 30;
        } else {
            return 31;
        }
    }

    function getHour(uint256 timeStamp) public pure returns (uint8) {
        return uint8((timeStamp / 3600) % 24);
    }

    function getMinute(uint256 timeStamp) public pure returns (uint8) {
        return uint8((timeStamp / 60) % 60);
    }

    function getSecond(uint256 timeStamp) public pure returns (uint8) {
        return uint8(timeStamp % 60);
    }

    function toTimeStamp(
        uint16 year,
        uint8 month,
        uint8 day,
        uint8 hour,
        uint8 minute,
        uint8 second
    ) public pure returns (uint256 timeStamp) {
        timeStamp = second;
        timeStamp += MINUTE_IN_SECOND * (minute);
        timeStamp += HOUR_IN_SECOND * (hour);
        timeStamp += DAY_IN_SECOND * (day - 1);

        uint16 i;
        for (i = START_YEAR; i < year; i++) {
            if (isLeapYear(i)) {
                timeStamp += LEAP_YEAR_IN_SECOND;
            } else {
                timeStamp += YEAR_IN_SECOND;
            }
        }

        uint8[12] memory monthDayCounts;
        monthDayCounts[0] = 31;
        if (isLeapYear(year)) {
            monthDayCounts[1] = 29;
        } else {
            monthDayCounts[1] = 28;
        }
        monthDayCounts[2] = 31;
        monthDayCounts[3] = 30;
        monthDayCounts[4] = 31;
        monthDayCounts[5] = 30;
        monthDayCounts[6] = 31;
        monthDayCounts[7] = 31;
        monthDayCounts[8] = 30;
        monthDayCounts[9] = 31;
        monthDayCounts[10] = 30;
        monthDayCounts[11] = 31;

        for (i = 0; i < month - 1; i++) {
            timeStamp += DAY_IN_SECOND * monthDayCounts[i];
        }
    }
    function toDateTime(uint256 timeStamp)
            internal
            pure
            returns (DateTime memory dateTime)
        {
            dateTime.year = getYear(timeStamp);
            uint256 totalLeapYears = getTotalLeapYearBefore(dateTime.year) -
                getTotalLeapYearBefore(START_YEAR);
            uint256 totalSeconds = YEAR_IN_SECOND *
                (dateTime.year - START_YEAR - totalLeapYears) +
                LEAP_YEAR_IN_SECOND *
                totalLeapYears;

            uint256 totalSecondsInMonth;
            uint8 daysInMonth;
            uint8 i;
            for (i = 1; i <= 12; i++) {
                daysInMonth = getDaysInMonth(i, dateTime.year);
                totalSecondsInMonth = DAY_IN_SECOND * daysInMonth;
                if (totalSecondsInMonth + totalSeconds > timeStamp) {
                    dateTime.month = i;
                    break;
                }
                totalSeconds += totalSecondsInMonth;
            }

            for (i = 1; i <= daysInMonth; i++) {
                if (DAY_IN_SECOND + totalSeconds > timeStamp) {
                    dateTime.day = i;
                    break;
                }
                totalSeconds += DAY_IN_SECOND;
            }

            dateTime.hour = getHour(timeStamp);
            dateTime.minute = getMinute(timeStamp);
            dateTime.second = getSecond(timeStamp);
    }
    uint256[50] private __gap;
}

