// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../Lock/TokenLock.sol";

contract LockFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    // -------------------- Custom Errors --------------------
    error ZeroAddress();
    error InsufficientFeeAllowance();
    error InsufficientFeeBalance();
    error InsufficientFeeNative();
    error InvalidFeeAmount();
    error InvalidAmount();
    error InvalidUnlockTime();
    error NotERC20();
    error NoBalance();
    error NotAllowed();
    error InvalidOffset();
    error LockNotFound();
    error TokenTransferFailed();
    error InvalidFeeOption();
    error DescriptionTooLong();
    error InvalidLPToken();
    error PermanentLockUnlockTime();
    error PermanentLockTransferAllowed();

    // -------------------- Constants --------------------
    string public constant VERSION = "1.0.0";

    // PancakeSwap Factory (BSC Mainnet)
    address public constant PANCAKE_FACTORY = 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;

    // -------------------- Enums --------------------
    enum FeeOption { Native, ERC20 }

    // -------------------- State Variables --------------------
    address public feeToken;
    uint256 public feeAmount;
    address public treasuryWallet;

    mapping(address => bool) public isFeeExempt;

    uint256 public lockCount;
    mapping(uint256 => address) public lockById;
    address[] public allLocks;
    mapping(address => bool) public isLock;

    mapping(address => address[]) public userLocks;

    EnumerableSet.AddressSet private allowedFeeTokens;

    bool public nativeFeeEnabled;

    // -------------------- Events --------------------
    event LockDeployed(
        uint256 indexed lockId,
        address indexed lockAddress,
        address indexed owner,
        address token,
        uint256 amount,
        uint256 unlockTime,
        uint256 createdAt,
        string description,
        address feeToken,
        uint256 feeAmount,
        FeeOption feeOption,
        bool isLP,
        bool permanent,
        bool ownershipTransferAllowed
    );
    event FeeAmountUpdated(uint256 oldFee, uint256 newFee);
    event FeeTokenUpdated(address oldToken, address newToken);
    event TreasuryWalletUpdated(address oldWallet, address newWallet);
    event FeeTokenAdded(address token);
    event FeeTokenRemoved(address token);
    event FeeExemptSet(address indexed user, bool status);
    event NativeFeeEnabled(bool enabled);

    // -------------------- Internal Validation (Non-Standard ERC20 Compatible) --------------------
    function _validateERC20(address _token) internal view {
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(_token)
        }
        if (codeSize == 0) revert NotERC20();

        // ✅ Only check totalSupply (most reliable)
        // symbol(), decimals(), name() are optional in ERC20 standard
        // We skip them to support non-standard tokens
        try IERC20Metadata(_token).totalSupply() returns (uint256) {
            // success
        } catch {
            revert NotERC20();
        }

        // Optional: check balanceOf to ensure it's callable
        try IERC20(_token).balanceOf(address(this)) returns (uint256) {
            // success
        } catch {
            revert NotERC20();
        }
    }

    // -------------------- LP Detection --------------------
    function _isLPToken(address _token) internal view returns (bool isLP, address token0, address token1) {
        (bool success0, bytes memory data0) = _token.staticcall(abi.encodeWithSignature("token0()"));
        if (!success0 || data0.length != 32) return (false, address(0), address(0));

        (bool success1, bytes memory data1) = _token.staticcall(abi.encodeWithSignature("token1()"));
        if (!success1 || data1.length != 32) return (false, address(0), address(0));

        token0 = abi.decode(data0, (address));
        token1 = abi.decode(data1, (address));

        // Verify via PancakeSwap factory
        (bool successPair, bytes memory pairData) = PANCAKE_FACTORY.staticcall(
            abi.encodeWithSignature("getPair(address,address)", token0, token1)
        );
        if (successPair && pairData.length == 32) {
            address pair = abi.decode(pairData, (address));
            if (pair == _token) {
                return (true, token0, token1);
            }
        }
        return (false, address(0), address(0));
    }

    // -------------------- Constructor --------------------
    constructor(
        address _treasuryWallet,
        address _feeToken,
        uint256 _feeAmount
    ) Ownable(msg.sender) {
        if (_treasuryWallet == address(0)) revert ZeroAddress();
        if (_feeAmount == 0) revert InvalidFeeAmount();

        treasuryWallet = _treasuryWallet;

        if (_feeToken != address(0)) {
            _validateERC20(_feeToken);
            feeToken = _feeToken;
            allowedFeeTokens.add(_feeToken);
        } else {
            feeToken = address(0);
        }
        feeAmount = _feeAmount;
        nativeFeeEnabled = true;
    }

    // -------------------- Admin Functions --------------------
    function setFeeAmount(uint256 _newFee) external onlyOwner {
        if (_newFee == 0) revert InvalidFeeAmount();
        uint256 oldFee = feeAmount;
        feeAmount = _newFee;
        emit FeeAmountUpdated(oldFee, _newFee);
    }

    function setFeeToken(address _newToken) external onlyOwner {
        address oldToken = feeToken;
        if (_newToken != address(0)) {
            _validateERC20(_newToken);
            if (!allowedFeeTokens.contains(_newToken)) {
                allowedFeeTokens.add(_newToken);
            }
        }
        feeToken = _newToken;
        emit FeeTokenUpdated(oldToken, _newToken);
    }

    function setNativeFeeEnabled(bool _enabled) external onlyOwner {
        nativeFeeEnabled = _enabled;
        emit NativeFeeEnabled(_enabled);
    }

    function setTreasuryWallet(address _newWallet) external onlyOwner {
        if (_newWallet == address(0)) revert ZeroAddress();
        if (_newWallet == treasuryWallet) revert NotAllowed();
        address oldWallet = treasuryWallet;
        treasuryWallet = _newWallet;
        emit TreasuryWalletUpdated(oldWallet, _newWallet);
    }

    function addFeeToken(address _token) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        _validateERC20(_token);
        if (!allowedFeeTokens.add(_token)) revert NotAllowed();
        emit FeeTokenAdded(_token);
    }

    function removeFeeToken(address _token) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        if (_token == feeToken) revert NotAllowed();
        if (!allowedFeeTokens.remove(_token)) revert NotAllowed();
        emit FeeTokenRemoved(_token);
    }

    function setFeeExempt(address _user, bool _status) external onlyOwner {
        if (_user == address(0)) revert ZeroAddress();
        isFeeExempt[_user] = _status;
        emit FeeExemptSet(_user, _status);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function renounceOwnership() public override onlyOwner {
        revert NotAllowed();
    }

    // -------------------- Emergency --------------------
    function emergencyWithdrawERC20(address _token, address _to) external onlyOwner {
        if (_to == address(0)) revert ZeroAddress();
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) revert NoBalance();
        token.safeTransfer(_to, balance);
    }

    // -------------------- Core: Create Lock (Generic) --------------------
    function createLock(
        address _token,
        address _owner,
        uint256 _amount,
        uint256 _unlockTime,
        string memory _description,
        FeeOption _feeOption,
        bool _permanent,
        bool _ownershipTransferAllowed
    ) external payable nonReentrant whenNotPaused {
        if (_permanent && _ownershipTransferAllowed) revert PermanentLockTransferAllowed();

        _createLockInternal(
            _token,
            _owner,
            _amount,
            _unlockTime,
            _description,
            _feeOption,
            false,
            _permanent,
            _ownershipTransferAllowed
        );
    }

    // -------------------- Core: Create Liquidity Lock (LP only) --------------------
    function createLiquidityLock(
        address _token,
        address _owner,
        uint256 _amount,
        uint256 _unlockTime,
        string memory _description,
        FeeOption _feeOption,
        bool _permanent,
        bool _ownershipTransferAllowed
    ) external payable nonReentrant whenNotPaused {
        if (_permanent && _ownershipTransferAllowed) revert PermanentLockTransferAllowed();

        (bool isLP, , ) = _isLPToken(_token);
        if (!isLP) revert InvalidLPToken();

        _createLockInternal(
            _token,
            _owner,
            _amount,
            _unlockTime,
            _description,
            _feeOption,
            true,
            _permanent,
            _ownershipTransferAllowed
        );
    }

    // -------------------- Internal Lock Creation --------------------
    function _createLockInternal(
        address _token,
        address _owner,
        uint256 _amount,
        uint256 _unlockTime,
        string memory _description,
        FeeOption _feeOption,
        bool _isLP,
        bool _permanent,
        bool _ownershipTransferAllowed
    ) internal {
        // ----- Validations -----
        if (_token == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        if (_amount == 0) revert InvalidAmount();
        if (!_permanent && _unlockTime <= block.timestamp) revert InvalidUnlockTime();
        if (_permanent && _unlockTime != 0) revert PermanentLockUnlockTime();
        if (bytes(_description).length > 200) revert DescriptionTooLong();

        _validateERC20(_token);

        // ----- Deploy Lock -----
        uint256 id = ++lockCount;

        TokenLock newLock = new TokenLock(
            _token,
            _owner,
            _amount,
            _unlockTime,
            id,
            _description,
            _permanent,
            _ownershipTransferAllowed
        );

        address lockAddress = address(newLock);

        // ----- Transfer tokens with delta check (rejects fee-on-transfer) -----
        uint256 beforeBalance = IERC20(_token).balanceOf(lockAddress);
        IERC20(_token).safeTransferFrom(msg.sender, lockAddress, _amount);
        uint256 afterBalance = IERC20(_token).balanceOf(lockAddress);

        if (afterBalance < beforeBalance) revert TokenTransferFailed();
        uint256 received = afterBalance - beforeBalance;
        if (received != _amount) revert TokenTransferFailed();

        // ----- Fee Collection (after successful transfer) -----
        if (!isFeeExempt[msg.sender]) {
            if (_feeOption == FeeOption.Native) {
                if (!nativeFeeEnabled) revert InvalidFeeOption();
                if (msg.value < feeAmount) revert InsufficientFeeNative();

                uint256 refund = msg.value - feeAmount;
                if (refund > 0) {
                    (bool sent, ) = payable(msg.sender).call{value: refund}("");
                    if (!sent) revert InsufficientFeeNative();
                }

                (bool sent, ) = treasuryWallet.call{value: feeAmount}("");
                if (!sent) revert InsufficientFeeNative();

            } else if (_feeOption == FeeOption.ERC20) {
                if (feeToken == address(0)) revert InvalidFeeOption();
                IERC20 token = IERC20(feeToken);
                if (token.balanceOf(msg.sender) < feeAmount) {
                    revert InsufficientFeeBalance();
                }
                if (token.allowance(msg.sender, address(this)) < feeAmount) {
                    revert InsufficientFeeAllowance();
                }
                token.safeTransferFrom(msg.sender, treasuryWallet, feeAmount);
            } else {
                revert InvalidFeeOption();
            }
        }

        // ----- Register -----
        lockById[id] = lockAddress;
        allLocks.push(lockAddress);
        isLock[lockAddress] = true;
        userLocks[_owner].push(lockAddress);

        emit LockDeployed(
            id,
            lockAddress,
            _owner,
            _token,
            _amount,
            _unlockTime,
            block.timestamp,
            _description,
            feeToken,
            feeAmount,
            _feeOption,
            _isLP,
            _permanent,
            _ownershipTransferAllowed
        );
    }

    // -------------------- View Functions --------------------
    function getAllLocks() external view returns (address[] memory) {
        return allLocks;
    }

    function getLocks(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = allLocks.length;

        if (total == 0) {
            return new address[](0);
        }

        if (offset >= total) revert InvalidOffset();

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 resultLength = end - offset;
        address[] memory result = new address[](resultLength);
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allLocks[offset + i];
        }
        return result;
    }

    function totalLocks() external view returns (uint256) {
        return allLocks.length;
    }

    function getUserLocks(address _user) external view returns (address[] memory) {
        return userLocks[_user];
    }

    function getUserLockCount(address _user) external view returns (uint256) {
        return userLocks[_user].length;
    }

    function getLockAddress(uint256 _lockId) external view returns (address) {
        address lock = lockById[_lockId];
        if (lock == address(0)) revert LockNotFound();
        return lock;
    }

    function getLockMetadata(uint256 _lockId)
        external
        view
        returns (
            address lockAddress,
            address token,
            address owner,
            uint256 amount,
            uint256 unlockTime,
            bool withdrawn,
            uint256 id,
            uint256 createdAt,
            string memory description,
            bool permanent,
            bool ownershipTransferAllowed
        )
    {
        lockAddress = lockById[_lockId];
        if (lockAddress == address(0)) revert LockNotFound();
        TokenLock lock = TokenLock(lockAddress);
        return (
            lockAddress,
            address(lock.token()),
            lock.owner(),
            lock.amount(),
            lock.unlockTime(),
            lock.withdrawn(),
            lock.lockId(),
            lock.createdAt(),
            lock.description(),
            lock.permanent(),
            lock.ownershipTransferAllowed()
        );
    }

    function isLockAddress(address _lock) external view returns (bool) {
        return isLock[_lock];
    }

    function isFeeTokenAllowed(address _token) external view returns (bool) {
        return allowedFeeTokens.contains(_token);
    }

    function getAllowedFeeTokens() external view returns (address[] memory) {
        return allowedFeeTokens.values();
    }

    function getLPTokenInfo(address _token)
        external
        view
        returns (
            bool isLP,
            address token0,
            address token1
        )
    {
        return _isLPToken(_token);
    }

    receive() external payable {
        revert();
    }
}