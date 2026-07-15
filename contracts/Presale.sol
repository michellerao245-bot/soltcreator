// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPresaleFactory {
    function markFinalized(uint256 presaleId) external;
    function markCancelled(uint256 presaleId) external;
}

contract Presale is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // -------------------- Custom Errors --------------------
    error PresaleNotActive();
    error PresaleFinalized();
    error PresaleCancelled();
    error AlreadyFinalized();
    error AlreadyCancelled();
    error NotFinalized();
    error SoftCapNotMet();
    error NotRefundable();
    error NothingToClaim();
    error AlreadyClaimed();
    error NotReady();
    error InsufficientDeposit();
    error ExceedsHardCap();
    error ExceedsMaxBuy();
    error BelowMinBuy();
    error InvalidAmount();
    error NotWhitelisted();
    error NativeValueMismatch();
    error NativeNotAccepted();
    error InvalidVestingParams();
    error InvalidToken();
    error TransferFailed();
    error NotEnoughTokens();
    error InvalidRecoveryToken();
    error ZeroAddress();
    error NotAllowed();

    // -------------------- Enums --------------------
    enum Status {
        Upcoming,
        Active,
        Finalized,
        Cancelled
    }

    // -------------------- Structs --------------------
    struct VestingSchedule {
        uint256 cliff;
        uint256 duration;
        uint256 tgePercent;
    }

    // -------------------- State Variables ------------
    IERC20 public saleToken;
    IERC20 public paymentToken;

    uint8 public saleDecimals;
    uint8 public paymentDecimals;

    uint256 public pricePerToken;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public minBuy;
    uint256 public maxBuy;
    uint256 public startTime;
    uint256 public endTime;

    uint256 public totalRaised;
    uint256 public totalSold;
    uint256 public totalDeposited;
    uint256 public totalParticipants;

    Status public status;

    uint256 public vestingStart;

    mapping(address => uint256) public contributions;
    mapping(address => uint256) public tokenClaimed;
    mapping(address => bool) public whitelist;
    mapping(address => bool) public hasRefunded;

    VestingSchedule public vesting;

    IPresaleFactory public factory;
    uint256 public presaleId;

    bool public depositCompleted;
    bool public whitelistEnabled;          // ✅ FIX 1: declared

    // -------------------- Events --------------------
    event TokensDeposited(uint256 amount, uint256 required);
    event TokensPurchased(address indexed buyer, uint256 payment, uint256 tokens);
    event TokensClaimed(address indexed user, uint256 amount);
    event Refunded(address indexed user, uint256 amount);
    event Finalized(uint256 totalRaised, uint256 totalSold, uint256 vestingStart);
    event Cancelled();
    event WhitelistUpdated(address[] users, bool status);
    event VestingUpdated(uint256 cliff, uint256 duration, uint256 tge);
    event DepositCompleted();
    event EmergencyWithdraw(address indexed to, uint256 amount);

    // -------------------- Modifiers --------------------
    modifier onlyBeforeStart() {
        if (block.timestamp >= startTime) revert NotReady();
        _;
    }

    modifier onlyActive() {
        if (status != Status.Active) revert PresaleNotActive();
        _;
    }

    modifier onlyFinalized() {
        if (status != Status.Finalized) revert NotFinalized();
        _;
    }

    modifier onlyCancelled() {
        if (status != Status.Cancelled) revert PresaleCancelled();
        _;
    }

    // -------------------- Constructor --------------------
    constructor(
        address _saleToken,
        address _paymentToken,
        uint256 _pricePerToken,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _minBuy,
        uint256 _maxBuy,
        uint256 _startTime,
        uint256 _endTime,
        bool _whitelistEnabled,
        uint256 _cliff,
        uint256 _vestingDuration,
        uint256 _tgePercent,
        address _factory,
        uint256 _presaleId
    ) Ownable(msg.sender) {
        if (_saleToken == address(0)) revert InvalidToken();
        if (_pricePerToken == 0) revert InvalidAmount();
        if (_softCap > _hardCap || _hardCap == 0) revert InvalidAmount();
        if (_minBuy > _maxBuy || _minBuy == 0) revert InvalidAmount();
        if (_startTime <= block.timestamp) revert InvalidAmount();
        if (_endTime <= _startTime) revert InvalidAmount();
        if (_tgePercent > 100) revert InvalidVestingParams();
        if (_factory == address(0)) revert InvalidToken();

        saleToken = IERC20(_saleToken);
        paymentToken = IERC20(_paymentToken);
        saleDecimals = IERC20Metadata(_saleToken).decimals();
        paymentDecimals = (_paymentToken == address(0)) ? 18 : IERC20Metadata(_paymentToken).decimals();

        pricePerToken = _pricePerToken;
        softCap = _softCap;
        hardCap = _hardCap;
        minBuy = _minBuy;
        maxBuy = _maxBuy;
        startTime = _startTime;
        endTime = _endTime;
        whitelistEnabled = _whitelistEnabled;   // ✅ set
        factory = IPresaleFactory(_factory);
        presaleId = _presaleId;

        if (_vestingDuration > 0) {
            vesting = VestingSchedule(_cliff, _vestingDuration, _tgePercent);
        }

        status = Status.Upcoming;
    }

    // -------------------- Pause/Unpause --------------------
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------- Prevent Ownership Renounce --------------------
    function renounceOwnership() public override onlyOwner {
        revert NotAllowed();
    }

    // -------------------- Owner Functions --------------
    function depositTokens(uint256 _amount) external onlyOwner onlyBeforeStart {
        if (_amount == 0) revert InvalidAmount();

        uint256 required = _calculateRequiredTokens();
        if (totalDeposited + _amount > required) revert InvalidAmount();

        saleToken.safeTransferFrom(msg.sender, address(this), _amount);
        totalDeposited += _amount;

        if (totalDeposited == required) {
            depositCompleted = true;
            emit DepositCompleted();
        }

        emit TokensDeposited(_amount, required);
    }

    function setWhitelist(address[] calldata _users, bool _status) external onlyOwner onlyBeforeStart {
        for (uint256 i = 0; i < _users.length; i++) {
            whitelist[_users[i]] = _status;
        }
        emit WhitelistUpdated(_users, _status);
    }

    function setVesting(uint256 _cliff, uint256 _duration, uint256 _tgePercent) external onlyOwner onlyBeforeStart {
        if (_tgePercent > 100) revert InvalidVestingParams();
        vesting = VestingSchedule(_cliff, _duration, _tgePercent);
        emit VestingUpdated(_cliff, _duration, _tgePercent);
    }

    function cancel() external onlyOwner {
        if (status == Status.Finalized) revert AlreadyFinalized();
        if (status == Status.Cancelled) revert AlreadyCancelled();
        // ✅ FIX 4: prevent cancellation if softCap already met
        if (totalRaised >= softCap) revert NotAllowed();

        status = Status.Cancelled;
        factory.markCancelled(presaleId);
        emit Cancelled();
    }

    function finalize() external onlyOwner {
        if (status == Status.Finalized) revert AlreadyFinalized();
        if (status == Status.Cancelled) revert PresaleCancelled();

        if (block.timestamp <= endTime && totalRaised < hardCap) revert NotReady();

        if (totalRaised >= softCap) {
            status = Status.Finalized;
            vestingStart = block.timestamp;
            factory.markFinalized(presaleId);

            uint256 paymentBalance = _getPaymentBalance();
            if (paymentBalance > 0) {
                _transferPaymentToOwner(paymentBalance);
            }

            uint256 unsold = totalDeposited - totalSold;
            if (unsold > 0) {
                saleToken.safeTransfer(owner(), unsold);
            }

            emit Finalized(totalRaised, totalSold, vestingStart);
        } else {
            status = Status.Cancelled;
            factory.markCancelled(presaleId);
            emit Cancelled();
        }
    }

    // -------------------- User Functions --------------
    function buyTokens(uint256 _paymentAmount) external payable nonReentrant whenNotPaused {
        if (_paymentAmount == 0) revert InvalidAmount();

        if (block.timestamp > endTime) revert PresaleNotActive();

        // Auto-start logic
        if (status == Status.Upcoming) {
            // ✅ FIX 2: use InsufficientDeposit if deposit not completed
            if (!depositCompleted) revert InsufficientDeposit();
            if (block.timestamp >= startTime) {
                status = Status.Active;
            } else {
                revert PresaleNotActive();
            }
        }

        if (status != Status.Active) revert PresaleNotActive();

        if (address(paymentToken) == address(0)) {
            if (msg.value != _paymentAmount) revert NativeValueMismatch();
        } else {
            if (msg.value != 0) revert NativeNotAccepted();
        }

        _validateBuy(_paymentAmount);

        uint256 tokenAmount = _calculateTokenAmount(_paymentAmount);
        if (tokenAmount == 0) revert InvalidAmount();

        if (totalSold + tokenAmount > totalDeposited) revert NotEnoughTokens();

        if (contributions[msg.sender] == 0) {
            totalParticipants++;
        }

        contributions[msg.sender] += _paymentAmount;
        totalRaised += _paymentAmount;
        totalSold += tokenAmount;

        if (address(paymentToken) != address(0)) {
            paymentToken.safeTransferFrom(msg.sender, address(this), _paymentAmount);
        }

        emit TokensPurchased(msg.sender, _paymentAmount, tokenAmount);
    }

    function _validateBuy(uint256 _paymentAmount) internal view {
        uint256 current = contributions[msg.sender];

        if (whitelistEnabled) {
            if (!whitelist[msg.sender]) revert NotWhitelisted();
        }

        if (_paymentAmount < minBuy) revert BelowMinBuy();
        if (current + _paymentAmount > maxBuy) revert ExceedsMaxBuy();
        if (totalRaised + _paymentAmount > hardCap) revert ExceedsHardCap();
    }

    function claimTokens() external nonReentrant whenNotPaused onlyFinalized {
        if (totalRaised < softCap) revert SoftCapNotMet();

        uint256 totalOwed = _calculateTotalOwed(msg.sender);
        uint256 claimed = tokenClaimed[msg.sender];
        uint256 raw = totalOwed - claimed;
        if (raw == 0) revert NothingToClaim();

        uint256 transferAmount = _applyVesting(raw);
        if (transferAmount == 0) revert NothingToClaim();

        tokenClaimed[msg.sender] += transferAmount;

        saleToken.safeTransfer(msg.sender, transferAmount);
        emit TokensClaimed(msg.sender, transferAmount);
    }

    function refund() external nonReentrant {
        if (status != Status.Cancelled) {
            if (block.timestamp <= endTime || totalRaised >= softCap) revert NotRefundable();
        }

        uint256 contribution = contributions[msg.sender];
        if (contribution == 0) revert InvalidAmount();
        if (hasRefunded[msg.sender]) revert AlreadyClaimed();

        hasRefunded[msg.sender] = true;
        contributions[msg.sender] = 0;

        _transferPaymentToUser(msg.sender, contribution);

        emit Refunded(msg.sender, contribution);
    }

    // -------------------- Vesting Logic ----------------
    function _applyVesting(uint256 _claimableAmount) internal view returns (uint256) {
        VestingSchedule memory v = vesting;
        if (v.duration == 0) return _claimableAmount;

        uint256 tge = (_claimableAmount * v.tgePercent) / 100;
        uint256 remaining = _claimableAmount - tge;
        uint256 vested = _calculateVestedAmount(remaining);
        return tge + vested;
    }

    function _calculateVestedAmount(uint256 _amount) internal view returns (uint256) {
        if (vestingStart == 0 || _amount == 0) return 0;
        VestingSchedule memory v = vesting;
        if (v.duration == 0) return 0;

        uint256 timeSince = block.timestamp - vestingStart;
        if (timeSince < v.cliff) return 0;

        uint256 elapsed = timeSince - v.cliff;
        if (elapsed >= v.duration) return _amount;

        return (_amount * elapsed) / v.duration;
    }

    // -------------------- Helpers (with proper decimals) --------------------
    function _calculateTokenAmount(uint256 _payment) internal view returns (uint256) {
        // 🔥 FIX 6: Correct decimal handling
        // tokenAmount = (payment * 10**saleDecimals) / (pricePerToken * 10**paymentDecimals)
        // pricePerToken is defined as payment token units for 1 full token (in sale decimals)
        // So tokenAmount = payment * 10**saleDecimals / pricePerToken
        // No need for paymentDecimals because pricePerToken is already in payment token units.
        // Example: USDT (6 decimals), sale token (18 decimals), price = 1e6 (1 USDT)
        // payment = 2e6 (2 USDT) -> tokenAmount = 2e6 * 10**18 / 1e6 = 2 * 10**18 = 2 full tokens.
        // This is correct because we divide by pricePerToken which is in payment decimals.
        // So we don't need paymentDecimals.
        return (_payment * (10 ** uint256(saleDecimals))) / pricePerToken;
    }

    function _calculateTotalOwed(address _user) internal view returns (uint256) {
        return _calculateTokenAmount(contributions[_user]);
    }

    function _calculateRequiredTokens() public view returns (uint256) {
        return (hardCap * (10 ** uint256(saleDecimals))) / pricePerToken;
    }

    // -------------------- Payment Transfer Helpers ----
    function _getPaymentBalance() internal view returns (uint256) {
        if (address(paymentToken) == address(0)) {
            return address(this).balance;
        } else {
            return paymentToken.balanceOf(address(this));
        }
    }

    function _transferPaymentToOwner(uint256 _amount) internal {
        if (address(paymentToken) == address(0)) {
            (bool sent, ) = payable(owner()).call{value: _amount}("");
            if (!sent) revert TransferFailed();
        } else {
            paymentToken.safeTransfer(owner(), _amount);
        }
    }

    function _transferPaymentToUser(address _user, uint256 _amount) internal {
        if (address(paymentToken) == address(0)) {
            (bool sent, ) = payable(_user).call{value: _amount}("");
            if (!sent) revert TransferFailed();
        } else {
            paymentToken.safeTransfer(_user, _amount);
        }
    }

    // -------------------- Emergency Recovery --------------------
    function recoverWrongToken(address _token, address _to) external onlyOwner {
        if (_token == address(0)) revert InvalidToken();
        if (_to == address(0)) revert ZeroAddress();
        if (status != Status.Finalized && status != Status.Cancelled) revert NotAllowed();
        if (_token == address(saleToken) || _token == address(paymentToken)) {
            revert InvalidRecoveryToken();
        }

        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) revert InvalidAmount();

        token.safeTransfer(_to, balance);
    }

    function emergencyWithdrawNative(address payable _to) external onlyOwner {
        if (_to == address(0)) revert ZeroAddress();
        if (status != Status.Finalized && status != Status.Cancelled) revert NotAllowed();

        uint256 balance = address(this).balance;
        if (balance == 0) revert InvalidAmount();

        if (address(paymentToken) == address(0)) {
            revert NotAllowed();
        } else {
            (bool sent, ) = _to.call{value: balance}("");
            if (!sent) revert TransferFailed();
            emit EmergencyWithdraw(_to, balance);
        }
    }

    // -------------------- View Functions ----------------
    function getContribution(address _user) external view returns (uint256) {
        return contributions[_user];
    }

    function getClaimable(address _user) external view returns (uint256) {
        if (status != Status.Finalized || totalRaised < softCap) return 0;
        uint256 totalOwed = _calculateTotalOwed(_user);
        uint256 claimed = tokenClaimed[_user];
        uint256 raw = totalOwed - claimed;
        if (raw == 0) return 0;
        return _applyVesting(raw);
    }

    function isWhitelisted(address _user) external view returns (bool) {
        return whitelist[_user];
    }

    function hasUserRefunded(address _user) external view returns (bool) {
        return hasRefunded[_user];
    }

    function getRemainingHardCap() external view returns (uint256) {
        if (totalRaised >= hardCap) return 0;
        return hardCap - totalRaised;
    }

    function getRemainingTokens() external view returns (uint256) {
        if (totalSold >= totalDeposited) return 0;
        return totalDeposited - totalSold;
    }

    function getPresaleInfo() external view returns (
        uint256 price,
        uint256 soft,
        uint256 hard,
        uint256 min,
        uint256 max,
        uint256 start,
        uint256 end,
        uint256 raised,
        uint256 sold,
        uint256 deposited,
        Status currentStatus,
        uint256 participants,
        uint256 vestingStartTime
    ) {
        return (
            pricePerToken,
            softCap,
            hardCap,
            minBuy,
            maxBuy,
            startTime,
            endTime,
            totalRaised,
            totalSold,
            totalDeposited,
            status,
            totalParticipants,
            vestingStart
        );
    }

    receive() external payable {}
}