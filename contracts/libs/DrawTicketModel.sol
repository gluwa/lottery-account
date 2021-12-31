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
        // Memory layout for ticket identifier:    
        // - 12 bytes for idx;
        // - 20 bytes for owner address;
        uint256 identifier;        
        uint256 lower;        
        uint256 upper;
    }
    
}
