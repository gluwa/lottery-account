pragma solidity ^0.5.0;

/** @title Library functions used by contracts within this ecosystem.*/
library DrawTicketModel {
    /**
     * @dev Enum of the different states a a draw ticket can be in.
     */
    enum DrawTicketState {
        /*0*/
        Invalid,
        /*1*/
        Active,
        /*2*/
        Expired,
        /*3*/
        Won,
        /*4*/
        Disqualified
    }

    struct DrawTicket {
        // Memory layout for ticket details:
        // - 6 bytes for creationDate;
        // - 6 bytes for drawnDate;
        // - 12 bytes for targetBlockNumber;
        // - 1 byte for state
        // - 7 bytes for idx;
        uint256 details;
        // address of the ticket's owner
        address owner;
    }
}
