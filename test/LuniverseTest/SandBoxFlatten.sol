pragma solidity ^0.5.0;


/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
contract Context {
    // Empty internal constructor, to prevent people from mistakenly deploying
    // an instance of this contract, which should be used via inheritance.
    constructor () internal { }
    // solhint-disable-previous-line no-empty-blocks

    function _msgSender() internal view returns (address payable) {
        return msg.sender;
    }

    function _msgData() internal view returns (bytes memory) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

/**
 * @title Initializable
 *
 * @dev Helper contract to support initializer functions. To use it, replace
 * the constructor with a function that has the `initializer` modifier.
 * WARNING: Unlike constructors, initializer functions must be manually
 * invoked. This applies both to deploying an Initializable contract, as well
 * as extending an Initializable contract via inheritance.
 * WARNING: When used with inheritance, manual care must be taken to not invoke
 * a parent initializer twice, or ensure that all initializers are idempotent,
 * because this is not dealt with automatically as with constructors.
 */
contract Initializable {

  /**
   * @dev Indicates that the contract has been initialized.
   */
  bool private initialized;

  /**
   * @dev Indicates that the contract is in the process of being initialized.
   */
  bool private initializing;

  /**
   * @dev Modifier to use in the initializer function of a contract.
   */
  modifier initializer() {
    require(initializing || isConstructor() || !initialized, "Contract instance has already been initialized");

    bool isTopLevelCall = !initializing;
    if (isTopLevelCall) {
      initializing = true;
      initialized = true;
    }

    _;

    if (isTopLevelCall) {
      initializing = false;
    }
  }

  /// @dev Returns true if and only if the function is running in the constructor
  function isConstructor() private view returns (bool) {
    // extcodesize checks the size of the code stored in an address, and
    // address returns the current address. Since the code is still not
    // deployed when running a constructor, any checks on its code size will
    // yield zero, making it an effective way to detect if a contract is
    // under construction or not.
    address self = address(this);
    uint256 cs;
    assembly { cs := extcodesize(self) }
    return cs == 0;
  }

  // Reserved storage space to allow for layout changes in the future.
  uint256[50] private ______gap;
}

/**
 * @dev Library for managing
 * https://en.wikipedia.org/wiki/Set_(abstract_data_type)[sets] of primitive
 * types.
 *
 * Sets have the following properties:
 *
 * - Elements are added, removed, and checked for existence in constant time
 * (O(1)).
 * - Elements are enumerated in O(n). No guarantees are made on the ordering.
 *
 * ```
 * contract Example {
 *     // Add the library methods
 *     using EnumerableSet for EnumerableSet.AddressSet;
 *
 *     // Declare a set state variable
 *     EnumerableSet.AddressSet private mySet;
 * }
 * ```
 *
 * As of v3.0.0, only sets of type `address` (`AddressSet`) and `uint256`
 * (`UintSet`) are supported.
 */
library EnumerableSet {
    // To implement this library for multiple types with as little code
    // repetition as possible, we write it in terms of a generic Set type with
    // bytes32 values.
    // The Set implementation uses private functions, and user-facing
    // implementations (such as AddressSet) are just wrappers around the
    // underlying Set.
    // This means that we can only create new EnumerableSets for types that fit
    // in bytes32.

    struct Set {
        // Storage of set values
        bytes32[] _values;

        // Position of the value in the `values` array, plus 1 because index 0
        // means a value is not in the set.
        mapping (bytes32 => uint256) _indexes;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function _add(Set storage set, bytes32 value) private returns (bool) {
        if (!_contains(set, value)) {
            set._values.push(value);
            // The value is stored at length-1, but we add 1 to all indexes
            // and use 0 as a sentinel value
            set._indexes[value] = set._values.length;
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function _remove(Set storage set, bytes32 value) private returns (bool) {
        // We read and store the value's index to prevent multiple reads from the same storage slot
        uint256 valueIndex = set._indexes[value];

        if (valueIndex != 0) { // Equivalent to contains(set, value)
            // To delete an element from the _values array in O(1), we swap the element to delete with the last one in
            // the array, and then remove the last element (sometimes called as 'swap and pop').
            // This modifies the order of the array, as noted in {at}.

            uint256 toDeleteIndex = valueIndex - 1;
            uint256 lastIndex = set._values.length - 1;

            // When the value to delete is the last one, the swap operation is unnecessary. However, since this occurs
            // so rarely, we still do the swap anyway to avoid the gas cost of adding an 'if' statement.

            bytes32 lastvalue = set._values[lastIndex];

            // Move the last value to the index where the value to delete is
            set._values[toDeleteIndex] = lastvalue;
            // Update the index for the moved value
            set._indexes[lastvalue] = toDeleteIndex + 1; // All indexes are 1-based

            // Delete the slot where the moved value was stored
            set._values.pop();

            // Delete the index for the deleted slot
            delete set._indexes[value];

            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function _contains(Set storage set, bytes32 value) private view returns (bool) {
        return set._indexes[value] != 0;
    }

    /**
     * @dev Returns the number of values on the set. O(1).
     */
    function _length(Set storage set) private view returns (uint256) {
        return set._values.length;
    }

   /**
    * @dev Returns the value stored at position `index` in the set. O(1).
    *
    * Note that there are no guarantees on the ordering of values inside the
    * array, and it may change when more values are added or removed.
    *
    * Requirements:
    *
    * - `index` must be strictly less than {length}.
    */
    function _at(Set storage set, uint256 index) private view returns (bytes32) {
        require(set._values.length > index, "EnumerableSet: index out of bounds");
        return set._values[index];
    }

    // AddressSet

    struct AddressSet {
        Set _inner;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function add(AddressSet storage set, address value) internal returns (bool) {
        return _add(set._inner, bytes32(uint256(value)));
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(AddressSet storage set, address value) internal returns (bool) {
        return _remove(set._inner, bytes32(uint256(value)));
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(AddressSet storage set, address value) internal view returns (bool) {
        return _contains(set._inner, bytes32(uint256(value)));
    }

    /**
     * @dev Returns the number of values in the set. O(1).
     */
    function length(AddressSet storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

   /**
    * @dev Returns the value stored at position `index` in the set. O(1).
    *
    * Note that there are no guarantees on the ordering of values inside the
    * array, and it may change when more values are added or removed.
    *
    * Requirements:
    *
    * - `index` must be strictly less than {length}.
    */
    function at(AddressSet storage set, uint256 index) internal view returns (address) {
        return address(uint256(_at(set._inner, index)));
    }


    // UintSet

    struct UintSet {
        Set _inner;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function add(UintSet storage set, uint256 value) internal returns (bool) {
        return _add(set._inner, bytes32(value));
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(UintSet storage set, uint256 value) internal returns (bool) {
        return _remove(set._inner, bytes32(value));
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(UintSet storage set, uint256 value) internal view returns (bool) {
        return _contains(set._inner, bytes32(value));
    }

    /**
     * @dev Returns the number of values on the set. O(1).
     */
    function length(UintSet storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

   /**
    * @dev Returns the value stored at position `index` in the set. O(1).
    *
    * Note that there are no guarantees on the ordering of values inside the
    * array, and it may change when more values are added or removed.
    *
    * Requirements:
    *
    * - `index` must be strictly less than {length}.
    */
    function at(UintSet storage set, uint256 index) internal view returns (uint256) {
        return uint256(_at(set._inner, index));
    }
}

/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev Returns true if `account` is a contract.
     *
     * This test is non-exhaustive, and there may be false-negatives: during the
     * execution of a contract's constructor, its address will be reported as
     * not containing a contract.
     *
     * IMPORTANT: It is unsafe to assume that an address for which this
     * function returns false is an externally-owned account (EOA) and not a
     * contract.
     */
     function isContract(address account) internal view returns (bool) {
        // This method relies in extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly { size := extcodesize(account) }
        return size > 0;
    }
    /**
     * @dev Converts an `address` into `address payable`. Note that this is
     * simply a type cast: the actual underlying value is not changed.
     *
     * _Available since v2.4.0._
     */
    function toPayable(address account) internal pure returns (address payable) {
        return address(uint160(account));
    }

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     *
     * _Available since v2.4.0._
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-call-value
        (bool success, ) = recipient.call.value(amount)("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }
}

/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```
 * function foo() public {
 *     require(hasRole(MY_ROLE, _msgSender()));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 */
contract AccessControlUpgradeSafe is Initializable, Context {
    function __AccessControl_init() internal initializer {        
        __AccessControl_init_unchained();
    }

    function __AccessControl_init_unchained() internal initializer {

    }

    using EnumerableSet for EnumerableSet.AddressSet;
    using Address for address;

    struct RoleData {
        EnumerableSet.AddressSet members;
        bytes32 adminRole;
    }

    mapping (bytes32 => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call, an admin role
     * bearer except when using {_setupRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);


    modifier onlyAdmin() {
        require(hasRole(_roles[DEFAULT_ADMIN_ROLE].adminRole, _msgSender()), "AccessControl: Sender do not have admin right");
        _;
    }


    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role].members.contains(account);
    }

    /**
     * @dev Returns the number of accounts that have `role`. Can be used
     * together with {getRoleMember} to enumerate all bearers of a role.
     */
    function getRoleMemberCount(bytes32 role) public view returns (uint256) {
        return _roles[role].members.length();
    }

    /**
     * @dev Returns one of the accounts that have `role`. `index` must be a
     * value between 0 and {getRoleMemberCount}, non-inclusive.
     *
     * Role bearers are not sorted in any particular way, and their ordering may
     * change at any point.
     *
     * WARNING: When using {getRoleMember} and {getRoleMemberCount}, make sure
     * you perform all queries on the same block. See the following
     * https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296[forum post]
     * for more information.
     */
    function getRoleMember(bytes32 role, uint256 index) public view returns (address) {
        return _roles[role].members.at(index);
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view returns (bytes32) {
        return _roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) public {
        require(hasRole(_roles[role].adminRole, _msgSender()), "AccessControl: sender must be an admin to grant");

        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) public {
        require(hasRole(_roles[role].adminRole, _msgSender()), "AccessControl: sender must be an admin to revoke");

        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `account`.
     */
    function renounceRole(bytes32 role, address account) public {
        require(account == _msgSender(), "AccessControl: can only renounce roles for self");

        _revokeRole(role, account);
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event. Note that unlike {grantRole}, this function doesn't perform any
     * checks on the calling account.
     *
     * [WARNING]
     * ====
     * This function should only be called from the constructor when setting
     * up the initial roles for the system.
     *
     * Using this function in any other way is effectively circumventing the admin
     * system imposed by {AccessControl}.
     * ====
     */
    function _setupRole(bytes32 role, address account) internal {
        _grantRole(role, account);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        _roles[role].adminRole = adminRole;
    }

    function _grantRole(bytes32 role, address account) private {
        if (_roles[role].members.add(account)) {
            emit RoleGranted(role, account, _msgSender());
        }
    }

    function _revokeRole(bytes32 role, address account) private {
        if (_roles[role].members.remove(account)) {
            emit RoleRevoked(role, account, _msgSender());
        }
    }

    uint256[50] private __gap;
}

contract VaultControl is Initializable, Context, AccessControlUpgradeSafe {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR");

    function __VaultControl_Init(address account) internal initializer {
        _setRoleAdmin(OPERATOR_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(DEFAULT_ADMIN_ROLE, account);
        _setupRole(OPERATOR_ROLE, account);
    }

    /// @dev Restricted to members of the admin role.
    modifier onlyAdmin() {
        require(isAdmin(_msgSender()), "Restricted to Admins.");
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
        grantRole(OPERATOR_ROLE, account);
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

    /// @dev Remove oneself from the Admin role thus all other roles.
    function renounceAdmin() public {
        address sender = _msgSender();
        renounceRole(DEFAULT_ADMIN_ROLE, sender);
        renounceRole(OPERATOR_ROLE, sender);
    }

    /// @dev Remove oneself from the Operator role.
    function renounceOperator() public {
        renounceRole(OPERATOR_ROLE, _msgSender());
    }

    uint256[50] private __gap;
}

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     *
     * _Available since v2.4.0._
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}

interface IERC20 {
    /**
     * @dev Returns the number of token's decimals.
     */
    function decimals() external view returns (uint8);

    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/** @title Library functions used by contracts within this ecosystem.*/
library GluwaAccountModel {
    /**
     * @dev Enum of the different states a Account Account can be in.
     */
    enum AccountState {
        /*0*/
        Pending,
        /*1*/
        Active,
        /*2*/
        Defaulted,
        /*3*/
        Locked,
        /*4*/
        Closed
    }

    struct Deposit {
        // Index of this Deposit
        uint256 idx;
        uint256 accountIdx;
        // address of the Account owner
        address owner;
        uint256 creationDate;
        uint256 amount;
    }

    struct SavingAccount {
        // Index of this account
        uint256 idx;
        bytes32 accountHash;
        // address of the Account owner
        address owner;        
        uint256 creationDate;
        uint256 balance;
        uint256 earning;
        // Different states a Account can be in
        AccountState state;
        bytes securityReferenceHash;
    }

    function generateDepositHash(
        uint256 id,
        uint256 deposit,
        address contractAddress,
        address owner
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(id, deposit, contractAddress, owner));
    }

    function generateAccountHash(
        uint256 startDate,
        address contractAddress,
        address owner
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    startDate,
                    "SavingAccount",
                    contractAddress,
                    owner
                )
            );
    }
}

/** @title Simple hash map index library without status to be used by contracts within this ecosystem.*/
library HashMapIndex {
    
    /**
     * @dev Efficient storage container for hashes enabling iteration
     */
    struct HashMapping {        
        mapping(uint256 => bytes32) itHashMap;
        uint256 firstIdx;
        uint256 nextIdx;
        uint256 count;
    }

    /**
     * @dev Add a new hash to the storage container if it is not yet part of it
     * @param self Struct storage container pointing to itself
     * @param _hash Hash to add to the struct
     */
    function add(HashMapping storage self, bytes32 _hash) internal {        
        self.itHashMap[self.nextIdx] = _hash;
        self.nextIdx++;
        self.count++;
    }   

    /**
     * @dev Retrieve the specified (_idx) hash from the struct
     * @param self Struct storage container pointing to itself
     * @param _idx Index of the hash to retrieve
     * @return Hash specified by the _idx value (returns 0x0 if _idx is an invalid index)
     */
    function get(HashMapping storage self, uint256 _idx)
        internal
        view
        returns (bytes32)
    {
        return self.itHashMap[_idx];
    }
}

/** @title Library functions used by contracts within this ecosystem.*/
library UintArrayUtil {
    function removeByIndex(uint256[] storage self, uint256 index) internal {
        if (index >= self.length) return;

        for (uint256 i = index; i < self.length - 1; i++) {
            self[i] = self[i + 1];
        }
        self.length--;
    }

    /// @dev the value for each item in the array must be unique
    function removeByValue(uint256[] storage self, uint256 val) internal {
        if (self.length == 0) return;
        uint256 j = 0;
        for (uint256 i = 0; i < self.length - 1; i++) {
            if (self[i] == val) {
                j = i + 1;
            }
            self[i] = self[j];
            j++;
        }
        self.length--;
    }

    /// @dev add new item into the array
    function add(uint256[] storage self, uint256 val) internal {
        self.push(val);
    }
}

contract GluwacoinSavingAccount is Initializable, Context {
    using HashMapIndex for HashMapIndex.HashMapping;
    using SafeMath for uint256;
    using UintArrayUtil for uint256[];
    enum AccountState {
        /*0*/
        Pending,
        /*1*/
        Active,
        /*2*/
        Defaulted,
        /*3*/
        Locked,
        /*4*/
        Closed
    }
    struct Deposit {
        // Index of this Deposit
        uint256 idx;
        uint256 accountIdx;
        // address of the Account owner
        address owner;
        uint256 creationDate;
        uint256 amount;
    }

    struct SavingAccount {
        // Index of this account
        uint256 idx;
        bytes32 accountHash;
        // address of the Account owner
        address owner;        
        uint256 creationDate;
        uint256 balance;
        uint256 earning;
        // Different states a Account can be in
        AccountState state;
        bytes securityReferenceHash;
    }
    uint256 private _budget;
    uint256 private _minimumDeposit;
    uint256 internal _totalDeposit;
    address[] internal _owners;

    HashMapIndex.HashMapping private _savingAccountIndex;
    HashMapIndex.HashMapping private _depositIndex;

    uint32 internal _standardInterestRate;
    /**
     * @dev
        if interest rate is 15%, the interestRatePercentageBase is 100 and interestRate is 15
        if interest rate is 15.5%, the interestRatePercentageBase is 1000 and interestRate is 155
     */
    uint32 internal _standardInterestRatePercentageBase;
    /// @dev The total amount users deposit to this Saving contract minus the withdrawn principal
    uint256 internal _allTimeTotalContractDeposit;

    /// @dev The supported token which can be deposited to a Saving account.
    IERC20 internal _token;
    /// @dev The total holding balance is SUM of all principal and yeild of non-matured Saving.
    mapping(address => SavingAccount)
        internal _addressSavingAccountMapping;
    mapping(bytes32 => Deposit) internal _depositStorage;
    mapping(bytes => bool) private _usedIdentityHash;

    event AccountCreated(bytes32 indexed accountHash, address indexed owner);

    event DepositCreated(
        bytes32 indexed depositHash,
        address indexed owner,
        uint256 deposit
    );

    event Withdrawn(
        address indexed owner,
        address indexed recipient,
        uint256 amount
    );

    function __GluwacoinSavingAccount_init_unchained(
        address tokenAddress,
        uint32 standardInterestRate,
        uint32 standardInterestRatePercentageBase,
        uint256 budget
    ) internal initializer {
        _token = IERC20(tokenAddress);
        _standardInterestRate = standardInterestRate;
        _standardInterestRatePercentageBase = standardInterestRatePercentageBase;
        _budget = budget;
        _minimumDeposit = 1;
        _savingAccountIndex = HashMapIndex.HashMapping({
            firstIdx: 1,
            nextIdx: 1,
            count: 0
        });
        _depositIndex = HashMapIndex.HashMapping({
            firstIdx: 1,
            nextIdx: 1,
            count: 0
        });
    }

    function _getSavingAccountFor(address account)
        internal
        view
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
        SavingAccount
            storage SavingAccount = _addressSavingAccountMapping[account];
        return (
            SavingAccount.idx,
            SavingAccount.accountHash,
            SavingAccount.owner,
            SavingAccount.creationDate,
            SavingAccount.balance,
            SavingAccount.earning,
            SavingAccount.state,
            SavingAccount.securityReferenceHash
        );
    }
    function generateAccountHash(
        uint256 startDate,
        address contractAddress,
        address owner
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    startDate,
                    "SavingAccount",
                    contractAddress,
                    owner
                )
            );
    }
    function generateDepositHash(
        uint256 id,
        uint256 deposit,
        address contractAddress,
        address owner
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(id, deposit, contractAddress, owner));
    }
    function _createSavingAccount(
        address owner_,
        uint256 initialDeposit,
        uint256 startDate,
        bytes memory identityHash
    ) internal returns (bytes32, bytes32) {
        _validateSavingBalance(initialDeposit);
        require(
            owner_ != address(0),
            "GluwaSavingAccount: Saving owner address must be defined"
        );
        require(
            _addressSavingAccountMapping[owner_].creationDate == 0,
            "GluwaSavingAccount: Each address should have only 1 Saving account only"
        );
        require(
            _usedIdentityHash[identityHash] == false,
            "GluwaSavingAccount: Identity hash is already used"
        );

        bytes32 accountHash_ = generateAccountHash(
            startDate,
            address(this),
            owner_
        );

        _addressSavingAccountMapping[owner_] = SavingAccount({
            idx: _savingAccountIndex.nextIdx,
            accountHash: accountHash_,
            owner: owner_,
            balance: 0,
            creationDate: startDate,
            earning: 0,
            state: AccountState.Active,
            securityReferenceHash: identityHash
        });
       
        _usedIdentityHash[identityHash] = true;
        _savingAccountIndex.add(accountHash_);
        _owners.push(owner_);

        bytes32 depositHash = _deposit(owner_, initialDeposit, startDate, false);

        emit AccountCreated(accountHash_, owner_);

        return (accountHash_, depositHash);
    }

    function _withdraw(
        address owner,
        address recipient,
        uint256 amount
    ) internal returns (uint256) {
        SavingAccount
            storage account = _addressSavingAccountMapping[owner];
        require(
            account.balance >= amount &&
                account.state == AccountState.Active,
            "GluwaSavingAccount: Withdrawal amount is higher than deposit or the saving account must be active"
        );
        account.balance -= amount;
        _totalDeposit -= amount;
        _token.transfer(recipient, amount);
        emit Withdrawn(owner, recipient, amount);
        return account.balance;
    }

    function _deposit(
        address owner,
        uint256 amount,
        uint256 dateTime,
        bool isEarning
    ) internal returns (bytes32) {
        _validateSavingBalance(amount);

        SavingAccount
            storage account = _addressSavingAccountMapping[owner];

        require(
            account.creationDate > 0,
            "GluwaSavingAccount: Account not found"
        );

        account.balance += amount;
        if (isEarning) {
            account.earning += amount;
        }
        bytes32 depositHash = generateDepositHash(
            account.idx,
            amount,
            address(this),
            owner
        );
        _depositStorage[depositHash] = Deposit({
            idx: _depositIndex.nextIdx,
            owner: owner,
            creationDate: dateTime,
            amount: amount,
            accountIdx: account.idx
        });
        _depositIndex.add(depositHash);
        _allTimeTotalContractDeposit += amount;
        _totalDeposit += amount;

        emit DepositCreated(depositHash, owner, amount);
        return depositHash;
    }

    function getDeposit(bytes32 depositHash)
        public
        view
        returns (
            uint256,
            uint256,
            address,
            uint256,
            uint256
        )
    {
        Deposit storage deposit = _depositStorage[
            depositHash
        ];
        return (
            deposit.idx,
            deposit.accountIdx,
            deposit.owner,
            deposit.creationDate,
            deposit.amount
        );
    }

    function getSavingAcount()
        external
        view
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
        return _getSavingAccountFor(_msgSender());
    }

    /**
     * @return all the Saving's settings;.
     */
    function getSavingSettings()
        public
        view
        returns (
            uint32,
            uint32,
            uint256,
            uint256,
            IERC20
        )
    {
        return (
            _standardInterestRate,
            _standardInterestRatePercentageBase,
            _budget,
            _minimumDeposit,
            _token
        );
    }

    function _setAccountSavingSettings(
        uint32 standardInterestRate,
        uint32 standardInterestRatePercentageBase,
        uint256 budget,
        uint256 minimumDeposit
    ) internal {
        _standardInterestRate = standardInterestRate;
        _standardInterestRatePercentageBase = standardInterestRatePercentageBase;
        _budget = budget;
        _minimumDeposit = minimumDeposit;
    }

    /**
     * @dev calculate earning for given amount based on term and interest rate.
            if interest rate is 15%, the interestRatePercentageBase is 100 and interestRate is 15
            if interest rate is 15.5%, the interestRatePercentageBase is 1000 and interestRate is 155
     */
    function _calculateearning(
        uint64 term,
        uint32 interestRate,
        uint32 interestRatePercentageBase,
        uint256 amount
    ) private pure returns (uint256) {
        uint256 earning = amount
            .mul(interestRate)
            .div(interestRatePercentageBase)
            .mul(term)
            .div(31536000); /// @dev 365 days in seconds
        return earning;
    }

    function _validateSavingBalance(uint256 deposit) private view {
        require(
            deposit >= _minimumDeposit &&
                deposit.add(_allTimeTotalContractDeposit) <= _budget,
            "GluwacoinSaving: the deposit must be >= min deposit & cannot make the total balance > the budget."
        );
    }

    uint256[50] private __gap;
}

// contract GluwacoinSavingAccount is Initializable, Context {
//     using HashMapIndex for HashMapIndex.HashMapping;
//     using SafeMath for uint256;
//     using UintArrayUtil for uint256[];
//     uint256 private _budget;
//     uint256 private _minimumDeposit;
//     uint256 internal _totalDeposit;
//     address[] internal _owners;
//     HashMapIndex.HashMapping private _savingAccountIndex;
//     HashMapIndex.HashMapping private _depositIndex;
//     uint32 internal _standardInterestRate;
//     /**
//      * @dev
//         if interest rate is 15%, the interestRatePercentageBase is 100 and interestRate is 15
//         if interest rate is 15.5%, the interestRatePercentageBase is 1000 and interestRate is 155
//      */
//     uint32 internal _standardInterestRatePercentageBase;
//     /// @dev The total amount users deposit to this Saving contract minus the withdrawn principal
//     uint256 internal _allTimeTotalContractDeposit;
//     /// @dev The supported token which can be deposited to a Saving account.
//     IERC20 internal _token;
//     /// @dev The total holding balance is SUM of all principal and yeild of non-matured Saving.
//     mapping(address => GluwaAccountModel.SavingAccount)
//         internal _addressSavingAccountMapping;
//     mapping(bytes32 => GluwaAccountModel.Deposit) internal _depositStorage;
//     mapping(bytes => bool) private _usedIdentityHash;
//     //mapping(bytes32 => GluwaAccountModel.SavingAccount) internal _savingAccountStorage;
//     event AccountCreated(bytes32 indexed accountHash, address indexed owner);
//     event DepositCreated(
//         bytes32 indexed depositHash,
//         address indexed owner,
//         uint256 deposit
//     );
//     event Withdrawn(
//         address indexed owner,
//         address indexed recipient,
//         uint256 amount
//     );
//     function __GluwacoinSavingAccount_init_unchained(
//         address tokenAddress,
//         uint32 standardInterestRate,
//         uint32 standardInterestRatePercentageBase,
//         uint256 budget
//     ) internal initializer {
//         _token = IERC20(tokenAddress);
//         _standardInterestRate = standardInterestRate;
//         _standardInterestRatePercentageBase = standardInterestRatePercentageBase;
//         _budget = budget;
//         _minimumDeposit = 1;
//         _savingAccountIndex = HashMapIndex.HashMapping({
//             firstIdx: 1,
//             nextIdx: 1,
//             count: 0
//         });
//         _depositIndex = HashMapIndex.HashMapping({
//             firstIdx: 1,
//             nextIdx: 1,
//             count: 0
//         });
//     }
//     function _getSavingAccountFor(address account)
//         internal
//         view
//         returns (
//             uint256,
//             bytes32,
//             address,
//             uint256,
//             uint256,
//             uint256,
//             GluwaAccountModel.AccountState,
//             bytes memory
//         )
//     {
//         GluwaAccountModel.SavingAccount
//             storage SavingAccount = _addressSavingAccountMapping[account];
//         return (
//             SavingAccount.idx,
//             SavingAccount.accountHash,
//             SavingAccount.owner,
//             SavingAccount.creationDate,
//             SavingAccount.balance,
//             SavingAccount.earning,
//             SavingAccount.state,
//             SavingAccount.securityReferenceHash
//         );
//     }
//     function _createSavingAccount(
//         address owner_,
//         uint256 initialDeposit,
//         uint256 startDate,
//         bytes memory identityHash
//     ) internal returns (bytes32, bytes32) {
//         _validateSavingBalance(initialDeposit);
//         require(
//             owner_ != address(0),
//             "GluwaSavingAccount: Saving owner address must be defined"
//         );
//         require(
//             _addressSavingAccountMapping[owner_].creationDate == 0,
//             "GluwaSavingAccount: Each address should have only 1 Saving account only"
//         );
//         require(
//             _usedIdentityHash[identityHash] == false,
//             "GluwaSavingAccount: Identity hash is already used"
//         );
//         bytes32 accountHash_ = GluwaAccountModel.generateAccountHash(
//             startDate,
//             address(this),
//             owner_
//         );
//         _addressSavingAccountMapping[owner_] = GluwaAccountModel.SavingAccount({
//             idx: _savingAccountIndex.nextIdx,
//             accountHash: accountHash_,
//             owner: owner_,
//             balance: 0,
//             creationDate: startDate,
//             earning: 0,
//             state: GluwaAccountModel.AccountState.Active,
//             securityReferenceHash: identityHash
//         });
//         _usedIdentityHash[identityHash] = true;
//         _savingAccountIndex.add(accountHash_);
//         _owners.push(owner_);
//         bytes32 depositHash = _deposit(owner_, initialDeposit, startDate, false);
//         emit AccountCreated(accountHash_, owner_);
//         return (accountHash_, depositHash);
//     }
//     function _withdraw(
//         address owner,
//         address recipient,
//         uint256 amount
//     ) internal returns (uint256) {
//         GluwaAccountModel.SavingAccount
//             storage account = _addressSavingAccountMapping[owner];
//         require(
//             account.balance >= amount &&
//                 account.state == GluwaAccountModel.AccountState.Active,
//             "GluwaSavingAccount: Withdrawal amount is higher than deposit or the saving account must be active"
//         );
//         account.balance -= amount;
//         _totalDeposit -= amount;
//         _token.transfer(recipient, amount);
//         emit Withdrawn(owner, recipient, amount);
//         return account.balance;
//     }
//     function _deposit(
//         address owner,
//         uint256 amount,
//         uint256 dateTime,
//         bool isEarning
//     ) internal returns (bytes32) {
//         _validateSavingBalance(amount);
//         GluwaAccountModel.SavingAccount
//             storage account = _addressSavingAccountMapping[owner];
//         require(
//             account.creationDate > 0,
//             "GluwaSavingAccount: Account not found"
//         );
//         account.balance += amount;
//         if (isEarning) {
//             account.earning += amount;
//         }
//         bytes32 depositHash = GluwaAccountModel.generateDepositHash(
//             account.idx,
//             amount,
//             address(this),
//             owner
//         );
//         _depositStorage[depositHash] = GluwaAccountModel.Deposit({
//             idx: _depositIndex.nextIdx,
//             owner: owner,
//             creationDate: dateTime,
//             amount: amount,
//             accountIdx: account.idx
//         });
//         _depositIndex.add(depositHash);
//         _allTimeTotalContractDeposit += amount;
//         _totalDeposit += amount;
//         emit DepositCreated(depositHash, owner, amount);
//         return depositHash;
//     }
//     function getDeposit(bytes32 depositHash)
//         public
//         view
//         returns (
//             uint256,
//             uint256,
//             address,
//             uint256,
//             uint256
//         )
//     {
//         GluwaAccountModel.Deposit storage deposit = _depositStorage[
//             depositHash
//         ];
//         return (
//             deposit.idx,
//             deposit.accountIdx,
//             deposit.owner,
//             deposit.creationDate,
//             deposit.amount
//         );
//     }
//     function getSavingAcount()
//         external
//         view
//         returns (
//             uint256,
//             bytes32,
//             address,
//             uint256,
//             uint256,
//             uint256,
//             GluwaAccountModel.AccountState,
//             bytes memory
//         )
//     {
//         return _getSavingAccountFor(_msgSender());
//     }
//     /**
//      * @return all the Saving's settings;.
//      */
//     function getSavingSettings()
//         public
//         view
//         returns (
//             uint32,
//             uint32,
//             uint256,
//             uint256,
//             IERC20
//         )
//     {
//         return (
//             _standardInterestRate,
//             _standardInterestRatePercentageBase,
//             _budget,
//             _minimumDeposit,
//             _token
//         );
//     }
//     function _setAccountSavingSettings(
//         uint32 standardInterestRate,
//         uint32 standardInterestRatePercentageBase,
//         uint256 budget,
//         uint256 minimumDeposit
//     ) internal {
//         _standardInterestRate = standardInterestRate;
//         _standardInterestRatePercentageBase = standardInterestRatePercentageBase;
//         _budget = budget;
//         _minimumDeposit = minimumDeposit;
//     }
//     /**
//      * @dev calculate earning for given amount based on term and interest rate.
//             if interest rate is 15%, the interestRatePercentageBase is 100 and interestRate is 15
//             if interest rate is 15.5%, the interestRatePercentageBase is 1000 and interestRate is 155
//      */
//     function _calculateearning(
//         uint64 term,
//         uint32 interestRate,
//         uint32 interestRatePercentageBase,
//         uint256 amount
//     ) private pure returns (uint256) {
//         uint256 earning = amount
//             .mul(interestRate)
//             .div(interestRatePercentageBase)
//             .mul(term)
//             .div(31536000); /// @dev 365 days in seconds
//         return earning;
//     }
//     function _validateSavingBalance(uint256 deposit) private view {
//         require(
//             deposit >= _minimumDeposit &&
//                 deposit.add(_allTimeTotalContractDeposit) <= _budget,
//             "GluwacoinSaving: the deposit must be >= min deposit & cannot make the total balance > the budget."
//         );
//     }
//     uint256[50] private __gap;
// }

/** @title Library functions used by contracts within this ecosystem.*/
library DrawTicketModel {   

    struct DrawTicket {
        // Memory layout for ticket identifier:    
        // - 12 bytes for idx;
        // - 20 bytes for owner address;
        uint256 identifier;        
        uint256 lower;        
        uint256 upper;
    }    
}

/** @title Simple index library without status to be used by contracts within this ecosystem.*/
library SimpleIndex {

    
    /**
     * @dev Efficient storage container for hashes enabling iteration
     */
    struct Index {   
        uint56 nextIdx;
    }

    /**
     * @dev Add a index to the storage container if it is not yet part of it
     * @param self Struct storage container pointing to itself
     */
    function add(Index storage self) internal {        
        self.nextIdx++;
    }   

     /**
     * @dev Add a index to the storage container if it is not yet part of it
     * @param self Struct storage container pointing to itself
     */
    function set(Index storage self, uint56 next) internal {        
        self.nextIdx = next;
    }   
    
}

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

// import "./libs/DateTimeModel.sol";
contract PrizeLinkedAccountVaultV1 is
    VaultControl,
    GluwacoinSavingAccount,
    GluwaPrizeDrawNoLib
{
    event WinnerSelected(address winner, uint256 reward);
    event Invested(address indexed recipient, uint256 amount);

    // using DateTimeModel for DateTimeModel;

    uint8 internal _lowerLimitPercentage;
    uint8 internal _tokenDecimal;
    uint16 private _processingCap;
    uint64 private _ticketPerToken;
    uint256 internal _boostingFund;

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
        external
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

contract SandboxPrizeLinkedAccountVaultV1 is PrizeLinkedAccountVaultV1 {   
    function getStatu(uint256 drawTimeStamp)external view returns(bool){
    return _prizePayingStatus[drawTimeStamp];

    }
    function getVersion1()external pure returns(string memory){
        return "version 1";
    }
    function makeDrawV1_Dummy(uint256 drawTimeStamp, uint256 seed)
        external
        onlyOperator
        returns (uint256)
    {
         _drawWinner[drawTimeStamp] = seed;
        return seed;
    }

    function makeDrawV1(uint256 drawTimeStamp, uint256 seed)
        external
        onlyOperator
        returns (uint256)
    {        
        bytes memory temp = new bytes(32);
        address sender = address(this);
        assembly {
            mstore(add(temp, 32), xor(seed, sender))
        }
        return _findDrawWinner_Dummy(drawTimeStamp, temp);
    }


    function createPrizedLinkAccount(
        address owner,
        uint256 amount,
        uint256 dateTime,
        bytes calldata securityHash
    ) external onlyOperator returns (bool) {
        require(
            _token.transferFrom(owner, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to send amount to deposit to a Saving Account"
        );
        (, bytes32 depositHash) = _createSavingAccount(
            owner,
            amount,
            dateTime,
            securityHash
        );
        return _createPrizedLinkTickets(depositHash);
    }
  
    function depositPrizedLinkAccount(address owner, uint256 amount, uint256 dateTime)
        external
        onlyOperator
        returns (bool)
    {
        require(
            _token.transferFrom(owner, address(this), amount),
            "GluwaPrizeLinkedAccount: Unable to send amount to deposit to a Saving Account"
        );
        return _depositPrizedLinkAccount(owner, amount, dateTime, false);
    }
    function awardWinnerV1_Dummy(uint256 drawTimeStamp)
         external
         onlyOperator
         returns (bool)
     {
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

}