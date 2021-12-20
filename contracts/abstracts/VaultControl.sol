pragma solidity ^0.5.0;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "../libs/AccessControl.sol";

contract VaultControl is Initializable, Context, AccessControlUpgradeSafe {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER");

    function __VaultControl_Init(address account) internal initializer {
        _setRoleAdmin(OPERATOR_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(CONTROLLER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(DEFAULT_ADMIN_ROLE, account);
        _setupRole(OPERATOR_ROLE, account);
        _setupRole(CONTROLLER_ROLE, account);
    }

    /// @dev Restricted to members of the admin role.
    modifier onlyAdmin() {
        require(isAdmin(_msgSender()), "Restricted to Admins.");
        _;
    }

    /// @dev Restricted to members of the Controller role.
    modifier onlyController() {
        require(isController(_msgSender()), "Restricted to Controllers.");
        _;
    }

    /// @dev Restricted to members of the Operator role.
    modifier onlyOperator() {
        require(isOperator(_msgSender()), "Restricted to Operators.");
        _;
    }

    /// @dev Return `true` if the account belongs to the admin role.
    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @dev Add an account to the admin role. Restricted to admins.
    function addAdmin(address account) public onlyAdmin {
        grantRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @dev Return `true` if the account belongs to the operator role.
    function isOperator(address account) public view returns (bool) {
        return hasRole(OPERATOR_ROLE, account);
    }

    /// @dev Add an account to the operator role. Restricted to admins.
    function addOperator(address account) public onlyAdmin {
        grantRole(OPERATOR_ROLE, account);
    }

    /// @dev Remove an account from the Operator role. Restricted to admins.
    function removeOperator(address account) public onlyAdmin {
        revokeRole(OPERATOR_ROLE, account);
    }

    /// @dev Return `true` if the account belongs to the Controller role.
    function isController(address account) public view returns (bool) {
        return hasRole(CONTROLLER_ROLE, account);
    }

    /// @dev Add an account to the Controller role. Restricted to admins.
    function addController(address account) public onlyAdmin {
        grantRole(CONTROLLER_ROLE, account);
    }

    /// @dev Remove an account from the Controller role. Restricted to Admins.
    function removeController(address account) public onlyAdmin {
        revokeRole(CONTROLLER_ROLE, account);
    }

    /// @dev Remove oneself from the Admin role thus all other roles.
    function renounceAdmin() public {
        address sender = _msgSender();
        renounceRole(DEFAULT_ADMIN_ROLE, sender);
        renounceRole(OPERATOR_ROLE, sender);
        renounceRole(CONTROLLER_ROLE, sender);
    }

    /// @dev Remove oneself from the Operator role.
    function renounceOperator() public {
        renounceRole(OPERATOR_ROLE, _msgSender());
    }

    /// @dev Remove oneself from the Controller role.
    function renounceController() public {
        renounceRole(CONTROLLER_ROLE, _msgSender());
    }
}
