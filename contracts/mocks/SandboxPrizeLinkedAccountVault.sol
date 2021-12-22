pragma solidity ^0.5.0;

import "../PrizeLinkedAccountVault.sol";

contract SandboxPrizeLinkedAccountVault is PrizeLinkedAccountVault {
    function getTicketDetailsById(uint256 idx) external view returns (uint256) {
        DrawTicketModel.DrawTicket storage ticket = _tickets[idx];
        return ticket.details;
    }

    function test(address owner) external pure returns (uint256, uint256) {
        return (uint256(uint160(owner)), uint256(uint160(owner)) << 96);
    }
}
