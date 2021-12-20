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
        // Index of this ticket
        uint256 idx;
        // address of the ticket's owner
        address owner;             
        uint256 creationDate;
        uint256 drawnDate;
        uint256 targetBlockNumber;
        // Different states a Ticket can be in
        DrawTicketState state;  
        bytes32 securityReferenceHash;    
    }       
}
