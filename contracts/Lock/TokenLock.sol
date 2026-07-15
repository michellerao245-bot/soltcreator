// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenLock is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------- Custom Errors --------------------
    error NotOwner();
    error NotUnlocked();
    error AlreadyWithdrawn();
    error InsufficientContractBalance();
    error DescriptionTooLong();
    error PermanentLock();
    error OwnershipTransferDisabled();
    error ZeroAddress();
    error InvalidAmount();
    error InvalidToken();
    error CannotRescueLockedToken();
    error NothingToRescue(); // ✅ New: replaced InvalidAmount in rescue

    // -------------------- Events --------------------
    event TokenLocked(
        uint256 indexed lockId,
        address indexed token,
        address indexed owner,
        uint256 amount,
        uint256 unlockTime,
        uint256 createdAt,
        string description,
        bool permanent,
        bool ownershipTransferAllowed
    );
    event TokenWithdrawn(
        uint256 indexed lockId,
        address indexed owner,
        address token,
        uint256 amount,
        uint256 withdrawnAt
    );
    event LockExtended(
        uint256 indexed lockId,
        uint256 oldUnlockTime,
        uint256 newUnlockTime
    );
    event LockOwnershipTransferred(
        uint256 indexed lockId,
        address indexed previousOwner,
        address indexed newOwner
    );
    event DescriptionUpdated(uint256 indexed lockId, string newDescription);
    event TokensRescued(address indexed token, address indexed to, uint256 amount);

    // -------------------- State Variables --------------------
    IERC20 public immutable token;
    address public owner;
    uint256 public immutable amount;
    uint256 public unlockTime;
    bool public withdrawn;
    uint256 public immutable lockId;
    uint256 public immutable createdAt;
    string public description;
    bool public immutable permanent;
    bool public immutable ownershipTransferAllowed;

    // -------------------- Constructor --------------------
    constructor(
        address _token,
        address _owner,
        uint256 _amount,
        uint256 _unlockTime,
        uint256 _lockId,
        string memory _description,
        bool _permanent,
        bool _ownershipTransferAllowed
    ) {
        if (_token == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        if (_amount == 0) revert InvalidAmount();

        if (!_permanent) {
            if (_unlockTime <= block.timestamp) revert NotUnlocked();
        } else {
            _unlockTime = 0;
        }
        if (bytes(_description).length > 200) revert DescriptionTooLong();

        uint256 size;
        assembly {
            size := extcodesize(_token)
        }
        if (size == 0) revert InvalidToken();

        if (_permanent && _ownershipTransferAllowed) {
            revert OwnershipTransferDisabled();
        }

        token = IERC20(_token);
        owner = _owner;
        amount = _amount;
        unlockTime = _unlockTime;
        withdrawn = false;
        lockId = _lockId;
        createdAt = block.timestamp;
        description = _description;
        permanent = _permanent;
        ownershipTransferAllowed = _ownershipTransferAllowed;

        emit TokenLocked(
            _lockId,
            _token,
            _owner,
            _amount,
            _unlockTime,
            createdAt,
            _description,
            _permanent,
            _ownershipTransferAllowed
        );
    }

    // -------------------- Withdraw --------------------
    function withdraw() external nonReentrant {
        if (msg.sender != owner) revert NotOwner();
        if (withdrawn) revert AlreadyWithdrawn();
        if (permanent) revert PermanentLock();
        if (block.timestamp < unlockTime) revert NotUnlocked();

        uint256 balance = token.balanceOf(address(this));
        if (balance < amount) revert InsufficientContractBalance();

        withdrawn = true;
        token.safeTransfer(owner, amount);

        emit TokenWithdrawn(lockId, owner, address(token), amount, block.timestamp);
    }

    // -------------------- Extend Lock --------------------
    function extendLock(uint256 newUnlockTime) external nonReentrant {
        if (msg.sender != owner) revert NotOwner();
        if (permanent) revert PermanentLock();
        if (newUnlockTime <= unlockTime || newUnlockTime <= block.timestamp) revert NotUnlocked();
        if (withdrawn) revert AlreadyWithdrawn();

        uint256 oldTime = unlockTime;
        unlockTime = newUnlockTime;
        emit LockExtended(lockId, oldTime, newUnlockTime);
    }

    // -------------------- Update Description --------------------
    function updateDescription(string memory _newDescription) external {
        if (msg.sender != owner) revert NotOwner();
        if (withdrawn) revert AlreadyWithdrawn();
        if (bytes(_newDescription).length > 200) revert DescriptionTooLong();

        description = _newDescription;
        emit DescriptionUpdated(lockId, _newDescription);
    }

    // -------------------- Transfer Ownership --------------------
    function transferLockOwnership(address newOwner) external nonReentrant {
        if (msg.sender != owner) revert NotOwner();
        if (newOwner == address(0)) revert ZeroAddress();
        if (!ownershipTransferAllowed) revert OwnershipTransferDisabled();

        address oldOwner = owner;
        owner = newOwner;
        emit LockOwnershipTransferred(lockId, oldOwner, newOwner);
    }

    // -------------------- Rescue Accidental Tokens --------------------
    function rescueERC20(address _token, address _to) external nonReentrant {
        if (msg.sender != owner) revert NotOwner();
        if (_to == address(0)) revert ZeroAddress();
        if (_token == address(token)) revert CannotRescueLockedToken();

        IERC20 erc20 = IERC20(_token);
        uint256 balance = erc20.balanceOf(address(this));
        if (balance == 0) revert NothingToRescue(); // ✅ Fixed: meaningful error

        erc20.safeTransfer(_to, balance);
        emit TokensRescued(_token, _to, balance);
    }

    // -------------------- View Functions --------------------
    function getLockInfo()
        external
        view
        returns (
            address tokenAddress,
            address ownerAddress,
            uint256 lockedAmount,
            uint256 unlockTimestamp,
            bool isWithdrawn,
            uint256 id,
            uint256 creationTime,
            string memory desc,
            bool isPermanent,
            bool isOwnershipTransferAllowed
        )
    {
        return (
            address(token),
            owner,
            amount,
            unlockTime,
            withdrawn,
            lockId,
            createdAt,
            description,
            permanent,
            ownershipTransferAllowed
        );
    }

    function remainingTime() external view returns (uint256) {
        if (permanent || withdrawn || block.timestamp >= unlockTime) return 0;
        return unlockTime - block.timestamp;
    }
}