// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title FairLaunch v17
 * @notice ⚠️ Supports standard ERC20 tokens ONLY.
 * @dev Fee-on-transfer, rebase, reflection tokens are NOT supported.
 *      Slippage auto-calculated based on slippagePercent parameter.
 */
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

// ----- Custom Errors -----
error InvalidParam();
error ZeroAddress();
error ZeroAmount();
error NotPendingState();
error NotActiveState();
error NotFinalizingState();
error AlreadyModified();
error InsufficientReserve();
error InsufficientETHBalance();
error LPNotFound();
error LPZeroAmount();
error InvalidState();
error CooldownActive();
error NotFactory();
error DepositLimitExceeded();

interface IUniswapV2Router {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IFactory {
    function resetTokenUsedFromLaunch(address token) external;
}

contract FairLaunch is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    enum RefundType { Refund, BurnUnsold }
    enum LaunchStatus { Pending, Active, Finalizing, Finalized, Cancelled }

    // Immutables
    address public immutable router;
    IERC20 public immutable token;
    address public immutable factory;
    uint256 public immutable slippagePercent; // 1-20 (1% to 20%)

    // ----- State Variables -----
    address public creator;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public minBuy;
    uint256 public maxBuy;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public claimStartTime;
    uint256 public listingRate;
    uint256 public liquidityPercent;
    uint256 public lpLockTime;
    uint256 public maxClaimDelay;
    uint256 public cancelTimestamp; // When launch was cancelled

    LaunchStatus public status;
    RefundType public refundType;
    uint8 public retryCount;
    bool public whitelistEnabled;
    bool public kycVerified;
    bool public auditVerified;
    bool public lpWithdrawn;
    bool public claimStartTimeModified;
    bool public cancelledNotified;

    uint256 public totalRaised;
    uint256 public totalParticipants;
    uint256 public totalTokensSold;
    uint256 public totalTokensDeposited;

    mapping(address => uint256) public contributions;
    mapping(address => uint256) public tokenAllocations;
    mapping(address => bool) public hasClaimed;
    mapping(address => bool) public hasRefunded;
    mapping(address => bool) public whitelist;
    mapping(address => bool) public blacklist;

    // LP Lock
    address public lpPair;
    uint256 public lpTokenAmount;
    uint256 public lpUnlockTime;

    // Anti-bot
    uint256 public antiBotBlocks;
    mapping(address => uint256) public lastBuyBlock;

    // Platform fee
    uint256 public platformFeePercent;
    address public feeWallet;
    uint256 public pendingPlatformFee;

    // Retry
    uint8 public constant MAX_RETRIES = 5;
    uint256 public pendingEthForLiquidity;
    uint256 public pendingTokensForLiquidity;
    uint256 public pendingTokensForSale;

    // ----- Events -----
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event TokensClaimed(address indexed user, uint256 tokenAmount);
    event RefundClaimed(address indexed user, uint256 ethAmount);
    event Finalized(uint256 totalRaised, uint256 tokensSold, uint256 liquidityAdded);
    event FinalizeFailed(string reason);
    event FinalizeRetry(uint8 attempt);
    event Cancelled();
    event EmergencyCancelled();
    event TokensDeposited(uint256 amount);
    event WhitelistUpdated(address indexed user, bool status);
    event BlacklistUpdated(address indexed user, bool status);
    event LPWithdrawn(address indexed to, uint256 amount);
    event LPLocked(address pair, uint256 amount, uint256 unlockTime);
    event ExcessWithdrawn(address indexed to, uint256 amount);
    event FeeWithdrawn(address indexed to, uint256 amount);
    event ClaimStartTimeUpdated(uint256 newTime);
    event KYCUpdated(bool status);
    event AuditUpdated(bool status);
    event EmergencyFinalizeCancel(address indexed creator);
    event UnsoldBurned(uint256 amount);
    event LaunchStarted();
    event FactoryNotifiedCancellation(address indexed factory);

    modifier onlyCreator() {
        if (msg.sender != creator) revert InvalidParam();
        _;
    }

    modifier launchActive() {
        if (status != LaunchStatus.Active) revert InvalidState();
        if (!(block.timestamp >= startTime && block.timestamp <= endTime)) revert InvalidState();
        _;
    }

    modifier notFinalized() {
        if (status == LaunchStatus.Finalized) revert InvalidState();
        _;
    }

    modifier notCancelled() {
        if (status == LaunchStatus.Cancelled) revert InvalidState();
        _;
    }

    modifier validWhitelist() {
        if (whitelistEnabled && !whitelist[msg.sender]) revert InvalidParam();
        _;
    }

    modifier notBlacklisted() {
        if (blacklist[msg.sender]) revert InvalidParam();
        _;
    }

    modifier onlyAfterRefundCooldown() {
        if (status != LaunchStatus.Cancelled) revert InvalidState();
        if (block.timestamp < cancelTimestamp + 30 days) revert CooldownActive();
        _;
    }

    constructor(
        address _creator,
        address _token,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _minBuy,
        uint256 _maxBuy,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _claimStartTime,
        uint256 _listingRate,
        uint256 _liquidityPercent,
        uint256 _lpLockTime,
        RefundType _refundType,
        bool _whitelistEnabled,
        address _router,
        uint256 _antiBotBlocks,
        uint256 _platformFeePercent,
        address _feeWallet,
        bool _kycVerified,
        bool _auditVerified,
        uint256 _maxClaimDelay,
        address _factory,
        uint256 _slippagePercent
    ) Ownable(_creator) {
        if (_creator == address(0)) revert ZeroAddress();
        if (_token == address(0)) revert ZeroAddress();
        if (_factory == address(0)) revert ZeroAddress();
        if (_softCap == 0 || _hardCap < _softCap) revert InvalidParam();
        if (_minBuy == 0 || _maxBuy < _minBuy) revert InvalidParam();
        if (_startTime <= block.timestamp) revert InvalidParam();
        if (_endTime <= _startTime) revert InvalidParam();
        if (_claimStartTime < _endTime) revert InvalidParam();
        if (_listingRate == 0) revert InvalidParam();
        if (_liquidityPercent < 50 || _liquidityPercent > 100) revert InvalidParam();
        if (_lpLockTime == 0) revert InvalidParam();
        if (_router == address(0)) revert ZeroAddress();
        if (_platformFeePercent > 10) revert InvalidParam();
        if (_feeWallet == address(0)) revert ZeroAddress();
        if (_maxClaimDelay == 0) revert InvalidParam();
        if (_slippagePercent == 0 || _slippagePercent > 20) revert InvalidParam();

        creator = _creator;
        token = IERC20(_token);
        factory = _factory;
        softCap = _softCap;
        hardCap = _hardCap;
        minBuy = _minBuy;
        maxBuy = _maxBuy;
        startTime = _startTime;
        endTime = _endTime;
        claimStartTime = _claimStartTime;
        listingRate = _listingRate;
        liquidityPercent = _liquidityPercent;
        lpLockTime = _lpLockTime;
        refundType = _refundType;
        whitelistEnabled = _whitelistEnabled;
        router = _router;
        antiBotBlocks = _antiBotBlocks;
        platformFeePercent = _platformFeePercent;
        feeWallet = _feeWallet;
        kycVerified = _kycVerified;
        auditVerified = _auditVerified;
        maxClaimDelay = _maxClaimDelay;
        slippagePercent = _slippagePercent;

        status = LaunchStatus.Pending;
    }

    // ----- Internal Functions -----
    function _safeApprove(address spender, uint256 amount) internal {
        if (amount == 0) {
            IERC20(address(token)).approve(spender, 0);
            return;
        }
        uint256 currentAllowance = IERC20(address(token)).allowance(address(this), spender);
        if (currentAllowance < amount) {
            if (currentAllowance > 0) {
                IERC20(address(token)).approve(spender, 0);
            }
            IERC20(address(token)).approve(spender, amount);
        }
    }

    function _safeTransferETH(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert InsufficientETHBalance();
    }

    // ----- Revert Decoder -----
    function _decodeRevert(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "Unknown error";
        if (data.length >= 68) {
            bytes4 selector;
            assembly {
                selector := mload(add(data, 0x20))
            }
            if (selector == 0x08c379a0) {
                bytes memory payload = new bytes(data.length - 4);
                for (uint i = 0; i < data.length - 4; ) {
                    payload[i] = data[i + 4];
                    unchecked { ++i; }
                }
                (string memory reason) = abi.decode(payload, (string));
                return reason;
            }
        }
        return string(abi.encodePacked("Custom error: 0x", _toHexString(data)));
    }

    function _toHexString(bytes memory data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(data.length * 2);
        for (uint i = 0; i < data.length; ) {
            result[i * 2] = hexChars[uint(uint8(data[i] >> 4))];
            result[i * 2 + 1] = hexChars[uint(uint8(data[i] & 0x0f))];
            unchecked { ++i; }
        }
        return string(result);
    }

    // ----- Deposit & Start -----
    function depositTokens(uint256 amount) external onlyCreator notFinalized notCancelled {
        if (status != LaunchStatus.Pending) revert NotPendingState();
        if (amount == 0) revert ZeroAmount();

        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 actualReceived = balanceAfter - balanceBefore;
        if (actualReceived == 0) revert ZeroAmount();

        uint256 maxRequired = Math.mulDiv(
            Math.mulDiv(hardCap, listingRate, 1 ether),
            100 + liquidityPercent,
            100
        );
        // FIXED: Only allow up to maxRequired, not 2x
        if (totalTokensDeposited + actualReceived > maxRequired) revert DepositLimitExceeded();

        totalTokensDeposited += actualReceived;
        emit TokensDeposited(actualReceived);
    }

    function startLaunch() external onlyCreator {
        if (status != LaunchStatus.Pending) revert NotPendingState();
        if (block.timestamp >= startTime) revert InvalidState();
        if (totalTokensDeposited == 0) revert ZeroAmount();

        uint256 minRequired = Math.mulDiv(
            Math.mulDiv(hardCap, listingRate, 1 ether),
            100 + liquidityPercent,
            100
        );
        if (totalTokensDeposited < minRequired) revert InsufficientReserve();

        status = LaunchStatus.Active;
        emit LaunchStarted();
    }

    function withdrawExcessTokens() external onlyCreator {
        if (status != LaunchStatus.Pending) revert NotPendingState();
        uint256 minRequired = Math.mulDiv(
            Math.mulDiv(hardCap, listingRate, 1 ether),
            100 + liquidityPercent,
            100
        );
        if (totalTokensDeposited <= minRequired) revert InvalidParam();
        uint256 excess = totalTokensDeposited - minRequired;
        totalTokensDeposited -= excess;
        token.safeTransfer(creator, excess);
        emit ExcessWithdrawn(creator, excess);
    }

    // ----- Buy (with reserve protection) -----
    function buy() external payable nonReentrant whenNotPaused launchActive validWhitelist notBlacklisted {
        if (msg.value < minBuy) revert InvalidParam();

        if (antiBotBlocks > 0) {
            if (block.number - lastBuyBlock[msg.sender] < antiBotBlocks) revert InvalidParam();
            lastBuyBlock[msg.sender] = block.number;
        }

        uint256 ethAmount = msg.value;
        if (totalRaised + ethAmount > hardCap) {
            uint256 excess = totalRaised + ethAmount - hardCap;
            if (msg.value <= excess) revert InvalidParam();
            ethAmount = msg.value - excess;
            _safeTransferETH(msg.sender, excess);
        }
        if (ethAmount == 0) revert ZeroAmount();
        if (contributions[msg.sender] + ethAmount > maxBuy) revert InvalidParam();

        uint256 tokenAmount = Math.mulDiv(ethAmount, listingRate, 1 ether);
        if (tokenAmount == 0) revert ZeroAmount();

        uint256 futureTotalRaised = totalRaised + ethAmount;
        uint256 futureTokensForLiquidity = Math.mulDiv(
            Math.mulDiv(futureTotalRaised, liquidityPercent, 100),
            listingRate,
            1 ether
        );
        uint256 futureTokensSold = totalTokensSold + tokenAmount;
        if (futureTokensSold + futureTokensForLiquidity > totalTokensDeposited) {
            revert InsufficientReserve();
        }

        totalRaised += ethAmount;
        totalTokensSold += tokenAmount;
        if (contributions[msg.sender] == 0) totalParticipants++;
        contributions[msg.sender] += ethAmount;
        tokenAllocations[msg.sender] += tokenAmount;

        emit TokensPurchased(msg.sender, ethAmount, tokenAmount);
    }

    // ----- Claim -----
    function claimTokens() external nonReentrant whenNotPaused {
        if (status != LaunchStatus.Finalized) revert InvalidState();
        if (block.timestamp < claimStartTime) revert InvalidState();
        if (hasClaimed[msg.sender]) revert InvalidParam();
        uint256 tokenAmount = tokenAllocations[msg.sender];
        if (tokenAmount == 0) revert ZeroAmount();

        hasClaimed[msg.sender] = true;
        tokenAllocations[msg.sender] = 0;
        token.safeTransfer(msg.sender, tokenAmount);
        emit TokensClaimed(msg.sender, tokenAmount);
    }

    function claimRefund() external nonReentrant whenNotPaused {
        if (status != LaunchStatus.Cancelled) revert InvalidState();
        if (hasRefunded[msg.sender]) revert InvalidParam();
        uint256 contribution = contributions[msg.sender];
        if (contribution == 0) revert ZeroAmount();

        hasRefunded[msg.sender] = true;
        contributions[msg.sender] = 0;
        tokenAllocations[msg.sender] = 0;
        _safeTransferETH(msg.sender, contribution);
        emit RefundClaimed(msg.sender, contribution);
    }

    // ----- Set Claim Start Time (only once) -----
    function setClaimStartTime(uint256 _newTime) external onlyCreator {
        if (status == LaunchStatus.Finalized || status == LaunchStatus.Cancelled) revert InvalidState();
        if (claimStartTimeModified) revert AlreadyModified();
        if (_newTime <= claimStartTime) revert InvalidParam();
        if (_newTime > endTime + maxClaimDelay * 1 days) revert InvalidParam();

        claimStartTime = _newTime;
        claimStartTimeModified = true;
        emit ClaimStartTimeUpdated(_newTime);
    }

    // ----- Update KYC/Audit -----
    function setKYC(bool _status) external onlyOwner {
        kycVerified = _status;
        emit KYCUpdated(_status);
    }

    function setAudit(bool _status) external onlyOwner {
        auditVerified = _status;
        emit AuditUpdated(_status);
    }

    // ----- Finalize (with auto slippage) -----
    function finalize() external nonReentrant notFinalized notCancelled {
        if (!(status == LaunchStatus.Active || status == LaunchStatus.Finalizing)) revert InvalidState();
        if (!(block.timestamp > endTime || totalRaised >= hardCap)) revert InvalidState();
        if (totalRaised < softCap) revert InvalidState();

        uint256 platformFee = Math.mulDiv(totalRaised, platformFeePercent, 100);
        pendingPlatformFee = platformFee;

        uint256 totalRaisedAfterFee = totalRaised - platformFee;
        uint256 ethForLiquidity = Math.mulDiv(totalRaisedAfterFee, liquidityPercent, 100);
        uint256 tokensForLiquidity = Math.mulDiv(ethForLiquidity, listingRate, 1 ether);
        uint256 tokensForSale = Math.mulDiv(totalRaised, listingRate, 1 ether);
        uint256 totalNeeded = tokensForSale + tokensForLiquidity;
        if (totalTokensDeposited < totalNeeded) revert InsufficientReserve();
        if (address(this).balance < ethForLiquidity) revert InsufficientETHBalance();

        pendingTokensForSale = tokensForSale;
        pendingEthForLiquidity = ethForLiquidity;
        pendingTokensForLiquidity = tokensForLiquidity;

        uint256 amountTokenMin = (tokensForLiquidity * (100 - slippagePercent)) / 100;
        uint256 amountETHMin = (ethForLiquidity * (100 - slippagePercent)) / 100;

        address factoryAddr = IUniswapV2Router(router).factory();
        address weth = IUniswapV2Router(router).WETH();
        address pair = IUniswapV2Factory(factoryAddr).getPair(address(token), weth);
        uint256 beforeBalance = pair != address(0) ? IERC20(pair).balanceOf(address(this)) : 0;

        _safeApprove(router, tokensForLiquidity);

        try IUniswapV2Router(router).addLiquidityETH{value: ethForLiquidity}(
            address(token),
            tokensForLiquidity,
            amountTokenMin,
            amountETHMin,
            address(this),
            block.timestamp + 3600
        ) returns (uint, uint, uint liquidity) {
            pair = IUniswapV2Factory(factoryAddr).getPair(address(token), weth);
            if (pair == address(0)) revert LPNotFound();

            uint256 afterBalance = IERC20(pair).balanceOf(address(this));
            uint256 lpReceived = afterBalance - beforeBalance;
            if (lpReceived == 0) revert LPZeroAmount();
            if (liquidity == 0) revert LPZeroAmount();

            _finalizeSuccess(tokensForSale, liquidity, pair, lpReceived);
        } catch (bytes memory reason) {
            status = LaunchStatus.Finalizing;
            emit FinalizeFailed(_decodeRevert(reason));
            revert(string(abi.encodePacked("Liquidity failed: ", _decodeRevert(reason))));
        }
    }

    // ----- Retry Finalize -----
    function retryFinalize() external onlyCreator nonReentrant {
        if (status != LaunchStatus.Finalizing) revert NotFinalizingState();
        if (pendingTokensForSale == 0) revert InvalidParam();
        if (retryCount >= MAX_RETRIES) revert InvalidParam();
        if (address(this).balance < pendingEthForLiquidity) revert InsufficientETHBalance();

        retryCount++;

        uint256 amountTokenMin = (pendingTokensForLiquidity * (100 - slippagePercent)) / 100;
        uint256 amountETHMin = (pendingEthForLiquidity * (100 - slippagePercent)) / 100;

        address factoryAddr = IUniswapV2Router(router).factory();
        address weth = IUniswapV2Router(router).WETH();
        address pair = IUniswapV2Factory(factoryAddr).getPair(address(token), weth);
        uint256 beforeBalance = pair != address(0) ? IERC20(pair).balanceOf(address(this)) : 0;

        _safeApprove(router, pendingTokensForLiquidity);

        try IUniswapV2Router(router).addLiquidityETH{value: pendingEthForLiquidity}(
            address(token),
            pendingTokensForLiquidity,
            amountTokenMin,
            amountETHMin,
            address(this),
            block.timestamp + 3600
        ) returns (uint, uint, uint liquidity) {
            pair = IUniswapV2Factory(factoryAddr).getPair(address(token), weth);
            if (pair == address(0)) revert LPNotFound();

            uint256 afterBalance = IERC20(pair).balanceOf(address(this));
            uint256 lpReceived = afterBalance - beforeBalance;
            if (lpReceived == 0) revert LPZeroAmount();
            if (liquidity == 0) revert LPZeroAmount();

            _finalizeSuccess(pendingTokensForSale, liquidity, pair, lpReceived);
            emit FinalizeRetry(retryCount);
        } catch (bytes memory reason) {
            emit FinalizeFailed(_decodeRevert(reason));
            revert(string(abi.encodePacked("Retry failed: ", _decodeRevert(reason))));
        }
    }

    // ----- Emergency Cancel Finalizing -----
    function emergencyCancelFinalizing() external onlyCreator {
        if (status != LaunchStatus.Finalizing) revert NotFinalizingState();
        if (retryCount < MAX_RETRIES) revert InvalidState();

        if (totalTokensDeposited > 0) {
            token.safeTransfer(creator, totalTokensDeposited);
            totalTokensDeposited = 0;
        }

        pendingPlatformFee = 0;
        pendingEthForLiquidity = 0;
        pendingTokensForLiquidity = 0;
        pendingTokensForSale = 0;
        retryCount = 0;

        status = LaunchStatus.Cancelled;
        cancelTimestamp = block.timestamp;
        _notifyFactoryOnCancel();
        emit EmergencyFinalizeCancel(creator);
        emit Cancelled();
    }

    function _finalizeSuccess(
        uint256 tokensForSale,
        uint256 liquidity,
        address pair,
        uint256 lpReceived
    ) internal {
        if (pendingPlatformFee > 0 && feeWallet != address(0)) {
            _safeTransferETH(feeWallet, pendingPlatformFee);
            emit FeeWithdrawn(feeWallet, pendingPlatformFee);
        }

        lpPair = pair;
        lpTokenAmount = lpReceived;
        lpUnlockTime = block.timestamp + lpLockTime;
        emit LPLocked(lpPair, lpTokenAmount, lpUnlockTime);

        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 extra = balanceAfter > tokensForSale ? balanceAfter - tokensForSale : 0;
        if (extra > 0) {
            if (refundType == RefundType.BurnUnsold) {
                token.safeTransfer(address(0xdead), extra);
                emit UnsoldBurned(extra);
            } else {
                token.safeTransfer(creator, extra);
                emit ExcessWithdrawn(creator, extra);
            }
        }

        uint256 leftoverETH = address(this).balance;
        if (leftoverETH > 0) {
            _safeTransferETH(creator, leftoverETH);
        }

        status = LaunchStatus.Finalized;
        emit Finalized(totalRaised, tokensForSale, liquidity);

        pendingEthForLiquidity = 0;
        pendingTokensForLiquidity = 0;
        pendingTokensForSale = 0;
        pendingPlatformFee = 0;
        retryCount = 0;
    }

    // ----- Cancel (with factory notification) -----
    function cancelLaunch() external onlyCreator notFinalized {
        if (status == LaunchStatus.Cancelled) revert InvalidState();
        if (block.timestamp < startTime) {
            // allow
        } else if (block.timestamp > endTime && totalRaised < softCap) {
            // allow
        } else {
            revert InvalidState();
        }
        _cancel(false);
    }

    function emergencyCancel() external onlyCreator {
        if (status != LaunchStatus.Pending) revert NotPendingState();
        _cancel(true);
        emit EmergencyCancelled();
    }

    function _cancel(bool returnTokensToCreator) internal {
        status = LaunchStatus.Cancelled;
        cancelTimestamp = block.timestamp;
        if (returnTokensToCreator || refundType == RefundType.Refund) {
            if (totalTokensDeposited > 0) {
                token.safeTransfer(creator, totalTokensDeposited);
            }
        } else {
            if (totalTokensDeposited > 0) {
                token.safeTransfer(address(0xdead), totalTokensDeposited);
            }
        }
        totalTokensDeposited = 0;
        _notifyFactoryOnCancel();
        emit Cancelled();
    }

    // ----- Factory callback (direct interface call) -----
    function _notifyFactoryOnCancel() internal {
        if (cancelledNotified) return;
        try IFactory(factory).resetTokenUsedFromLaunch(address(token)) {
            cancelledNotified = true;
            emit FactoryNotifiedCancellation(factory);
        } catch {
            // Silent fail – owner can manually reset via factory
        }
    }

    // ----- Withdraw LP -----
    function withdrawLP() external onlyCreator {
        if (status != LaunchStatus.Finalized) revert InvalidState();
        if (block.timestamp < lpUnlockTime) revert InvalidState();
        if (lpWithdrawn) revert AlreadyModified();
        if (lpPair == address(0) || lpTokenAmount == 0) revert InvalidParam();

        lpWithdrawn = true;
        uint256 amount = lpTokenAmount;
        lpTokenAmount = 0;
        IERC20(lpPair).safeTransfer(creator, amount);
        emit LPWithdrawn(creator, amount);
    }

    // ----- Whitelist & Blacklist -----
    function setWhitelist(address[] calldata users, bool state) external onlyCreator {
        if (users.length > 150) revert InvalidParam();
        for (uint i = 0; i < users.length; ) {
            whitelist[users[i]] = state;
            emit WhitelistUpdated(users[i], state);
            unchecked { ++i; }
        }
    }

    function setBlacklist(address[] calldata users, bool state) external onlyCreator {
        if (users.length > 150) revert InvalidParam();
        for (uint i = 0; i < users.length; ) {
            blacklist[users[i]] = state;
            emit BlacklistUpdated(users[i], state);
            unchecked { ++i; }
        }
    }

    function setWhitelistEnabled(bool enabled) external onlyCreator {
        whitelistEnabled = enabled;
    }

    // ----- Pause -----
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ----- Emergency Recover (ONLY after 30-day cooldown) -----
    function recoverERC20(address tokenAddr, uint256 amount) external onlyOwner onlyAfterRefundCooldown {
        if (tokenAddr == address(token)) revert InvalidParam();
        if (tokenAddr == lpPair) revert InvalidParam();
        address weth = IUniswapV2Router(router).WETH();
        if (tokenAddr == weth) revert InvalidParam();
        IERC20(tokenAddr).safeTransfer(owner(), amount);
    }

    function recoverETH(uint256 amount) external onlyOwner onlyAfterRefundCooldown {
        if (amount > address(this).balance) revert InsufficientETHBalance();
        _safeTransferETH(owner(), amount);
    }

    // ----- Views -----
    function getUserInfo(address user) external view returns (
        uint256, uint256, bool, bool, bool, bool, bool, bool
    ) {
        return (
            contributions[user],
            tokenAllocations[user],
            hasClaimed[user],
            hasRefunded[user],
            whitelist[user],
            blacklist[user],
            kycVerified,
            auditVerified
        );
    }

    function getLaunchInfo() external view returns (
        uint256, uint256, uint256, uint256, LaunchStatus, uint256, uint256
    ) {
        return (
            totalRaised,
            totalParticipants,
            totalTokensSold,
            totalTokensDeposited,
            status,
            lpUnlockTime,
            lpTokenAmount
        );
    }

    function remainingAllocation(address user) external view returns (uint256) {
        if (contributions[user] >= maxBuy) return 0;
        return maxBuy - contributions[user];
    }

    function getRemainingHardcap() external view returns (uint256) {
        if (totalRaised >= hardCap) return 0;
        return hardCap - totalRaised;
    }

    function getPercentageRaised() external view returns (uint256) {
        if (hardCap == 0) return 0;
        return Math.mulDiv(totalRaised, 100, hardCap);
    }

    receive() external payable { revert("Use buy()"); }
}