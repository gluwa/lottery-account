pragma solidity ^0.5.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "../libs/DrawTicketModel.sol";
import "../libs/HashMapIndex.sol";
import "../libs/UintArrayUtil.sol";
import "../libs/DateTimeModel.sol";

contract GluwaPrizeDraw is Initializable, Context {
    using SafeMath for uint256;

    using UintArrayUtil for uint256[];
    using HashMapIndex for HashMapIndex.HashMapping;

    //IDepositableAccount private _depositContract;
    HashMapIndex.HashMapping private _drawTicketIndex;

    uint8 internal _tokenDecimal;
    uint16 internal _tokenPerTicket;
    uint16 internal _ticketValidityTargetBlock;
    uint16 internal _cutOffTime; //total seconds from 12:00 am of the same date
    uint256 internal _nextDraw;
    uint256 internal _currentWinner;
    uint32 internal _totalTicketPerBatch;
    mapping(uint256 => DrawTicketModel.DrawTicket) internal _tickets;
    mapping(bytes32 => uint256[]) internal _ticketsDepositMapping;
    mapping(bytes32 => uint256) internal _totalTicketPerDeposit;
    mapping(uint256 => DrawTicketModel.DrawTicketState) internal _validTickets;
    mapping(address => uint256[]) internal _addressValidTicketMapping;
    mapping(uint256 => uint256[]) internal _drawTicketMapping;
    mapping(uint256 => mapping(uint256 => uint256))
        internal _ticketInUpcomingDraw;

    event Winner(address winner, uint256 ticket, uint256 reward);

    function __GluwaPrizeDraw_init_unchained(
        uint8 tokenDecimal,
        uint16 tokenPerTicket,
        uint16 ticketValidityTargetBlock,
        uint32 totalTicketPerBatch
    ) internal initializer {
        _tokenDecimal = tokenDecimal;
        _tokenPerTicket = tokenPerTicket;
        _ticketValidityTargetBlock = ticketValidityTargetBlock;
        _totalTicketPerBatch = totalTicketPerBatch;
        _drawTicketIndex = HashMapIndex.HashMapping({
            firstIdx: 1,
            nextIdx: 1,
            count: 0
        });
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

    function _findWinner(uint256 drawTimeStamp)
        internal
        returns (DrawTicketModel.DrawTicket storage)
    {
        uint256[] storage tickets = _drawTicketMapping[drawTimeStamp];
        DrawTicketModel.DrawTicket storage first = _tickets[0];
        uint256 firstTicketNo = _generateTicketNumber(
            first.targetBlockNumber,
            first.idx,
            first.owner
        );
        uint256 max = firstTicketNo;
        uint256 min = firstTicketNo;
        _ticketInUpcomingDraw[_nextDraw][firstTicketNo] = first.idx;
        _nextDraw = drawTimeStamp;
        for (uint256 i = 1; i < tickets.length; i++) {
            DrawTicketModel.DrawTicket storage one = _tickets[tickets[i]];
            uint256 ticketNo = _generateTicketNumber(
                one.targetBlockNumber,
                one.idx,
                one.owner
            );
            if (ticketNo > max) {
                max = ticketNo;
            } else if (ticketNo < min) {
                min = ticketNo;
            }
            _ticketInUpcomingDraw[_nextDraw][ticketNo] = one.idx;
        }
        uint256 winner = _randomNumber(min, max);
        _currentWinner = winner;
        return _tickets[_ticketInUpcomingDraw[_nextDraw][winner]];
    }

    function _generateTicketNumber(
        uint256 blockNumber,
        uint256 ticketId,
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
        bytes32 referenceHash
    ) internal returns (uint256[] memory) {
        uint256 totalTickets = _totalTicketPerDeposit[referenceHash] -
            _ticketsDepositMapping[referenceHash].length;
        require(
            totalTickets > 0,
            "GluwaPrizeDraw: no more tickets can be created for this deposit"
        );
        uint32 maxProcssed = _totalTicketPerBatch;
        if (totalTickets < _totalTicketPerBatch) {
            maxProcssed = uint32(totalTickets);
        }
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
        uint256 targetBlock = block.number + _ticketValidityTargetBlock;
        for (uint32 i = 0; i < maxProcssed; i++) {
            _tickets[_drawTicketIndex.nextIdx] = DrawTicketModel.DrawTicket({
                idx: _drawTicketIndex.nextIdx,
                owner: owner_,
                creationDate: depositTimeStamp,
                drawnDate: drawTimeStamp,
                targetBlockNumber: targetBlock,
                state: DrawTicketModel.DrawTicketState.Active,
                securityReferenceHash: referenceHash
            });
            _addressValidTicketMapping[owner_].add(_drawTicketIndex.nextIdx);
            _drawTicketMapping[drawTimeStamp].add(_drawTicketIndex.nextIdx);
            _ticketsDepositMapping[referenceHash].add(_drawTicketIndex.nextIdx);
            _drawTicketIndex.add(
                keccak256(
                    abi.encodePacked(
                        owner_,
                        depositTimeStamp,
                        drawTimeStamp,
                        targetBlock
                    )
                )
            );
        }
    }

    function _getTicket(uint256 idx)
        internal
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
        DrawTicketModel.DrawTicket storage ticket = _tickets[idx];
        return (
            ticket.idx,
            ticket.owner,
            ticket.creationDate,
            ticket.drawnDate,
            ticket.targetBlockNumber,
            ticket.state
        );
    }

    function _getTicketState(uint256 ticketNumber)
        internal
        view
        returns (DrawTicketModel.DrawTicketState)
    {
        return _validTickets[ticketNumber];
    }
}
