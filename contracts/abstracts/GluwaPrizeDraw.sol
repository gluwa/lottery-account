pragma solidity ^0.5.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "../libs/DrawTicketModel.sol";
import "../libs/SimpleIndex.sol";
import "../libs/UintArrayUtil.sol";
import "../libs/DateTimeModel.sol";

contract GluwaPrizeDraw is Initializable, Context {
    using SafeMath for uint256;

    using UintArrayUtil for uint256[];
    using SimpleIndex for SimpleIndex.Index;

    //IDepositableAccount private _depositContract;
    SimpleIndex.Index private _drawTicketIndex;
    bool internal _suspendDeposit;
    uint8 internal _cutOffHour; //Hour 0-23, to ensure 24 hour before the drawdate
    uint8 internal _cutOffMinute; //Minute 0-59, to ensure 24 hour before the drawdate
    uint128 internal _ticketRangeFactor; // 2nd Factor to ensure the chance 2 userss tickets in a draw overlapping each other is very low
    uint256 internal _totalPrizeBroughForward;
    mapping(uint256 => DrawTicketModel.DrawTicket) internal _tickets;
    mapping(uint256 => uint256[]) internal _drawTicketMapping;
    mapping(uint256 => uint256) internal _drawTicketCurrentUpper;
    mapping(uint256 => mapping(address => uint256))
        internal _drawParticipantTicket;
    mapping(uint256 => address[]) internal _drawParticipant;
    mapping(uint256 => uint256) internal _drawWinner;
    mapping(uint256 => uint256) internal _balanceEachDraw;
    mapping(uint256 => address[]) internal _drawWinningParticipant;
    mapping(uint256 => bool) internal _prizePayingStatus;

    event Winner(address winner, uint256 ticket, uint256 reward);

    event CreateTicket(
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

    function _randomNumber(
        uint256 min,
        uint256 max,
        bytes memory externalFactor
    ) internal view returns (uint256) {
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
        uint256[] storage drawTickets = _drawTicketMapping[drawTimeStamp];
        max = _tickets[drawTickets[0]].upper;
        min = _tickets[drawTickets[0]].lower;
        for (uint256 i = 1; i < drawTickets.length; i++) {
            if (_tickets[drawTickets[i]].upper > max) {
                max = _tickets[drawTickets[i]].upper;
            }
            if (_tickets[drawTickets[i]].lower < min) {
                min = _tickets[drawTickets[i]].lower;
            }
        }
    }

    function _findDrawWinner(uint256 drawTimeStamp, bytes memory externalFactor)
        internal
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
        returns (address[] memory result)
    {
        require(
            _drawWinner[drawTimeStamp] > 0,
            "GluwaPrizeDraw: the draw has not been made"
        );
        address[] storage participants = _drawParticipant[drawTimeStamp];
        uint64 j;
        for (uint256 i = 1; i < participants.length; i++) {
            if (
                _tickets[_drawParticipantTicket[drawTimeStamp][participants[i]]]
                    .upper >
                _tickets[_drawParticipantTicket[drawTimeStamp][participants[i]]]
                    .lower &&
                _tickets[_drawParticipantTicket[drawTimeStamp][participants[i]]]
                    .upper >=
                _drawWinner[drawTimeStamp] &&
                _tickets[_drawParticipantTicket[drawTimeStamp][participants[i]]]
                    .lower >=
                _drawWinner[drawTimeStamp]
            ) {
                result[j] = participants[i];
                j++;
            }
        }
    }

    function _findWinner(uint256 drawTimeStamp) internal {
        require(
            _drawWinner[drawTimeStamp] > 0 &&
                _drawWinningParticipant[drawTimeStamp].length == 0,
            "GluwaPrizeDraw: problem when finding winner"
        );
        address[] storage participants = _drawParticipant[drawTimeStamp];
        for (uint256 i = 1; i < participants.length; i++) {
            if (
                _tickets[_drawParticipantTicket[drawTimeStamp][participants[i]]]
                    .upper >=
                _drawWinner[drawTimeStamp] &&
                _tickets[_drawParticipantTicket[drawTimeStamp][participants[i]]]
                    .lower >=
                _drawWinner[drawTimeStamp]
            ) {
                _drawWinningParticipant[drawTimeStamp].push(participants[i]);
            }
        }
    }

    function _calculateDrawTime(uint256 txnTimeStamp)
        internal
        view
        returns (uint256 drawTimeStamp)
    {
        DateTimeModel.DateTime memory drawDateTime = DateTimeModel.toDateTime(
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
        uint8 daysInMonth = DateTimeModel.getDaysInMonth(
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
        drawTimeStamp = DateTimeModel.toTimeStamp(
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
        uint256 issuedTicket
    ) internal returns (bool) {
        return
            _createTicket(
                owner_,
                _calculateDrawTime(depositTimeStamp),
                issuedTicket
            );
    }

    function _createTicket(
        address owner_,
        uint256 drawTimeStamp,
        uint256 issuedTicket
    ) internal returns (bool) {
        if (_drawParticipantTicket[drawTimeStamp][owner_] > 0) {
            uint256 existingIssuedTicket = _tickets[
                _drawParticipantTicket[drawTimeStamp][owner_]
            ].upper -
                _tickets[_drawParticipantTicket[drawTimeStamp][owner_]].lower;
            _balanceEachDraw[drawTimeStamp] +=
                issuedTicket -
                existingIssuedTicket;
            _tickets[_drawParticipantTicket[drawTimeStamp][owner_]].upper +=
                issuedTicket -
                existingIssuedTicket;
            (uint256 ticketId, ) = _getTicketDetails(
                _tickets[_drawParticipantTicket[drawTimeStamp][owner_]]
                    .identifier
            );
            emit CreateTicket(
                drawTimeStamp,
                ticketId,
                owner_,
                _tickets[_drawParticipantTicket[drawTimeStamp][owner_]].lower,
                _tickets[_drawParticipantTicket[drawTimeStamp][owner_]].upper
            );
        } else {
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
            _balanceEachDraw[drawTimeStamp] += issuedTicket;
            _drawParticipant[drawTimeStamp].push(owner_);
            _drawParticipantTicket[drawTimeStamp][owner_] = _drawTicketIndex
                .nextIdx;
            _drawTicketMapping[drawTimeStamp].add(ticketId);
            _drawTicketCurrentUpper[drawTimeStamp] = ticketUpper;
            emit CreateTicket(
                drawTimeStamp,
                ticketId,
                owner_,
                ticketLower,
                ticketUpper
            );
            _drawTicketIndex.add();
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
        (ticketId, owner) = _getTicketDetails(ticket.identifier);
        lower = ticket.lower;
        upper = ticket.upper;
    }

    function _getTicketDetails(uint256 details)
        internal
        pure
        returns (uint96 ticketId, address owner)
    {
        owner = address(details);
        ticketId = uint96(details >> 160);
    }

    function getDrawDetails(uint256 drawTimeStamp)
        public
        view
        returns (
            address[] memory participants,
            uint256[] memory ticketIds,
            uint256 winningTicket,
            uint256 balanceEachDraw
        )
    {
        participants = _drawParticipant[drawTimeStamp];
        ticketIds = _drawTicketMapping[drawTimeStamp];
        winningTicket = _drawWinner[drawTimeStamp];
        balanceEachDraw = _balanceEachDraw[drawTimeStamp];
    }
}
