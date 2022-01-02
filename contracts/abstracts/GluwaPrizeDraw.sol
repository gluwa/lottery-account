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
    uint8 internal _tokenDecimal;
    uint16 internal _tokenPerTicket;
    uint16 internal _ticketValidityTargetBlock;
    uint16 internal _cutOffTime; //total seconds from 12:00 am of the same date
    uint256 internal _nextDraw;
    uint256 internal _currentWinner;
    uint256 internal _totalPrizeBroughForward;
    mapping(uint256 => DrawTicketModel.DrawTicket) internal _tickets;
    mapping(address => uint256[]) internal _addressValidTicketMapping;
    mapping(uint256 => uint256[]) internal _drawTicketMapping;
    mapping(uint256 => mapping(address => uint256))
        internal _drawParticipantTicket;
    mapping(uint256 => address[]) internal _drawParticipant;
    mapping(uint256 => uint256) internal _drawWinner;
    mapping(uint256 => uint256) internal _totalDepositEachDraw;
    mapping(uint256 => address[]) internal _drawWinningParticipant;
    mapping(uint256 => bool) internal _prizePayingStatus;

    mapping(uint256 => mapping(uint256 => uint256))
        internal _ticketInUpcomingDraw;

    event Winner(address winner, uint256 ticket, uint256 reward);

    event CreateTicket(uint256 indexed drawTimeStamp, uint256 indexed ticketId, address indexed owner, uint256 upper, uint256 lower);

    function __GluwaPrizeDraw_init_unchained(
        uint8 tokenDecimal,
        uint16 tokenPerTicket,
        uint16 ticketValidityTargetBlock
    ) internal initializer {
        _tokenDecimal = tokenDecimal;
        _tokenPerTicket = tokenPerTicket;
        _ticketValidityTargetBlock = ticketValidityTargetBlock;
        _drawTicketIndex = SimpleIndex.Index({nextIdx: 1});
    }

    function _randomNumber(uint256 min, uint256 max)
        internal
        view
        returns (uint256)
    {
        uint256 random = (uint256(
            keccak256(
                abi.encodePacked(
                    now,
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

    function findMaxMinForDraw(uint256 drawTimeStamp)
        public
        view
        returns (uint256 max, uint256 min)
    {
        address[] storage participants = _drawParticipant[drawTimeStamp];
        max = _tickets[_drawParticipantTicket[drawTimeStamp][participants[0]]]
            .upper;
        min = _tickets[_drawParticipantTicket[drawTimeStamp][participants[0]]]
            .lower;
        for (uint256 i = 1; i < participants.length; i++) {
            if (
                _tickets[_drawParticipantTicket[drawTimeStamp][participants[i]]]
                    .upper > max
            ) {
                max = _tickets[
                    _drawParticipantTicket[drawTimeStamp][participants[i]]
                ].upper;
            }
            if (
                _tickets[_drawParticipantTicket[drawTimeStamp][participants[i]]]
                    .lower < min
            ) {
                min = _tickets[
                    _drawParticipantTicket[drawTimeStamp][participants[i]]
                ].lower;
            }
        }
    }

    function _findDrawWinner(uint256 drawTimeStamp) internal returns (uint256) {
        require(
            _drawWinner[drawTimeStamp] == 0,
            "GluwaPrizeDraw: the draw has been made"
        );
        (uint256 min, uint256 max) = findMaxMinForDraw(drawTimeStamp);
        _drawWinner[drawTimeStamp] = _randomNumber(min, max);
        return _drawWinner[drawTimeStamp];
    }

    function getWinner(uint256 drawTimeStamp)
        internal
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

    function _generateTicketNumber(
        uint64 ticketId,
        uint96 blockNumber,
        address owner
    ) internal view returns (uint256) {
        return
            uint256(
                blockhash(blockNumber) ^
                    _convertUintToByte(ticketId) ^
                    bytes32(uint256(uint160(owner)) << 96)
            );
    }

    function _convertUintToByte(uint256 val) internal pure returns (bytes32) {
        bytes32 temp;
        assembly {
            mstore(add(temp, 32), val)
        }
        return temp;
    }

    function _getValidTicketId(address owner)
        internal
        view
        returns (uint256[] storage tickets)
    {
        return _addressValidTicketMapping[owner];
    }

    function _getValidTicket(address owner)
        internal
        view
        returns (DrawTicketModel.DrawTicket[] memory tickets)
    {
        uint256[] storage ticketList = _addressValidTicketMapping[owner];
        tickets = new DrawTicketModel.DrawTicket[](ticketList.length);
        for (uint256 i = 0; i < ticketList.length; i++) {
            tickets[i] = _tickets[ticketList[i]];
        }
    }

    function _createTicketForDeposit(
        address owner_,
        uint256 depositTimeStamp,
        uint256 ticketUpper,
        uint256 ticketLower
    ) internal returns (bool) {
        DateTimeModel.DateTime memory drawDateTime = DateTimeModel.toDateTime(
            depositTimeStamp
        );
        uint8 nextDrawDay = 2;
        if (
            drawDateTime.hour < 16 ||
            (drawDateTime.hour == 16 && drawDateTime.minute <= 59)
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
        drawDateTime.hour = 17;
        drawDateTime.minute = 0;
        drawDateTime.second = 0;
        uint256 drawTimeStamp = DateTimeModel.toTimeStamp(
            drawDateTime.year,
            drawDateTime.month,
            drawDateTime.day,
            drawDateTime.hour,
            drawDateTime.minute,
            drawDateTime.second
        );
        return _createTicket(owner_, drawTimeStamp, ticketUpper, ticketLower);
    }

    function _createTicket(
        address owner_,
        uint256 drawTimeStamp,
        uint256 ticketUpper,
        uint256 ticketLower
    ) internal returns (bool) {
        if (_drawParticipantTicket[drawTimeStamp][owner_] > 0) {
            _totalDepositEachDraw[drawTimeStamp] +=
                ticketUpper -
                ticketLower -
                _tickets[_drawParticipantTicket[drawTimeStamp][owner_]].upper +
                _tickets[_drawParticipantTicket[drawTimeStamp][owner_]].lower;
            _tickets[_drawParticipantTicket[drawTimeStamp][owner_]]
                .upper = ticketUpper;
            _tickets[_drawParticipantTicket[drawTimeStamp][owner_]]
                .lower = ticketLower;
            (uint256 ticketId,) = _getTicketDetails(_tickets[_drawParticipantTicket[drawTimeStamp][owner_]].identifier);
            emit CreateTicket(drawTimeStamp, ticketId, owner_, ticketUpper, ticketLower);
        } else {
            uint256 identifier_ = uint256(_drawTicketIndex.nextIdx);
            identifier_ |= uint160(owner_) << 96;
            _tickets[_drawTicketIndex.nextIdx] = DrawTicketModel.DrawTicket({
                identifier: identifier_,
                upper: ticketUpper,
                lower: ticketLower
            });
            _totalDepositEachDraw[drawTimeStamp] += ticketUpper - ticketLower;
            _drawParticipant[drawTimeStamp].push(owner_);
            _drawParticipantTicket[drawTimeStamp][owner_] = _drawTicketIndex
                .nextIdx;
            _drawTicketMapping[drawTimeStamp].add(_drawTicketIndex.nextIdx);
            emit CreateTicket(drawTimeStamp, _drawTicketIndex.nextIdx, owner_, ticketUpper, ticketLower);
            _drawTicketIndex.set(_drawTicketIndex.nextIdx);            
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
        ticketId = uint96(details);
        owner = address(uint160(details >> 96));
    }
}
