// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../fairlaunch/FairLaunch.sol";

contract FairLaunchFactory is Ownable, Pausable {
    using SafeERC20 for IERC20;

    string public constant VERSION = "17.0.0";

    // SOLT Fee
    IERC20 public soltToken;
    address public treasuryWallet;
    uint256 public constant SOLT_CREATION_FEE = 1000 * 10**18;
    uint256 public bnbCreationFee = 0.1 ether;

    // Router whitelist
    mapping(address => bool) public whitelistedRouters;
    address public defaultRouter;

    // Duplicate launch protection
    mapping(address => bool) public tokenUsed;
    mapping(address => address) public tokenToLaunch;

    uint256 public antiBotBlocks;
    uint256 public platformFeePercent;
    address public platformFeeWallet;
    uint256 public maxClaimDelay = 30; // days
    uint256 public slippagePercent = 2; // 2% default

    uint256 public totalLaunches;

    mapping(uint256 => address) public launchIdToAddress;
    mapping(address => uint256[]) public creatorLaunches;
    mapping(address => bool) public isLaunch;

    // Registries
    mapping(address => bool) public kycVerified;
    mapping(address => bool) public auditVerified;

    // Events
    event FairLaunchCreated(
        uint256 indexed launchId,
        address indexed launchAddress,
        address indexed creator,
        address token,
        address router,
        uint256 softCap,
        uint256 hardCap,
        uint256 startTime,
        uint256 endTime,
        bool kyc,
        bool audit
    );
    event TreasuryWalletUpdated(address newWallet);
    event DefaultRouterUpdated(address newRouter);
    event RouterWhitelisted(address router, bool status);
    event PlatformFeeUpdated(uint256 newFee, address wallet);
    event AntiBotBlocksUpdated(uint256 blocks);
    event BnbFeeUpdated(uint256 newFee);
    event MaxClaimDelayUpdated(uint256 newDelay);
    event SlippagePercentUpdated(uint256 newSlippage);
    event CreationFeePaid(address indexed payer, uint256 soltAmount, uint256 bnbAmount);
    event KYCVerified(address indexed user, bool status);
    event AuditVerified(address indexed project, bool status);
    event TokenUsedReset(address indexed token, bool status);

    modifier onlyFactory() {
        require(isLaunch[msg.sender], "Not a launch contract");
        _;
    }

    constructor(
    address _defaultRouter,
    address _soltToken,
    address _treasuryWallet,
    address _platformFeeWallet,
    uint256 _antiBotBlocks,
    uint256 _platformFeePercent,
    uint256 _maxClaimDelay,
    uint256 _slippagePercent
) Ownable(msg.sender) {
    
        require(_defaultRouter != address(0), "Invalid router");
        require(_soltToken != address(0), "Invalid SOLT");
        require(_treasuryWallet != address(0), "Invalid treasury");
        require(_platformFeeWallet != address(0), "Invalid fee wallet");
        require(_platformFeePercent <= 10, "Fee max 10%");
        require(_maxClaimDelay > 0 && _maxClaimDelay <= 365, "Delay 1-365 days");
        require(_slippagePercent > 0 && _slippagePercent <= 20, "Slippage 1-20%");

        defaultRouter = _defaultRouter;
        soltToken = IERC20(_soltToken);
        treasuryWallet = _treasuryWallet;
        platformFeeWallet = _platformFeeWallet;
        antiBotBlocks = _antiBotBlocks;
        platformFeePercent = _platformFeePercent;
        maxClaimDelay = _maxClaimDelay;
        slippagePercent = _slippagePercent;

        whitelistedRouters[_defaultRouter] = true;
    }

    function createFairLaunch(
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
        FairLaunch.RefundType _refundType,
        bool _whitelistEnabled,
        address _router
    ) external payable whenNotPaused returns (address launchAddress) {
        // ----- Validate token -----
        require(_token != address(0), "Invalid token");
        require(_token != address(soltToken), "Cannot use SOLT token");
        require(!tokenUsed[_token], "Token already used in another launch");

        try IERC20Metadata(_token).totalSupply() returns (uint256) {
            // pass
        } catch {
            revert("Token does not support totalSupply()");
        }
        try IERC20Metadata(_token).decimals() returns (uint8) {
            // pass
        } catch {
            revert("Token does not support decimals()");
        }

        try IERC20(_token).balanceOf(address(this)) returns (uint256) {
            // pass
        } catch {
            revert("Token does not support balanceOf()");
        }

        require(_softCap > 0, "Soft cap > 0");
        require(_hardCap >= _softCap, "Hard cap >= Soft cap");
        require(_minBuy > 0, "Min buy > 0");
        require(_maxBuy >= _minBuy, "Max buy >= Min buy");
        require(_startTime > block.timestamp, "Start > now");
        require(_endTime > _startTime, "End > Start");
        require(_claimStartTime >= _endTime, "Claim start >= end");
        require(_listingRate > 0, "Rate > 0");
        require(_liquidityPercent >= 50 && _liquidityPercent <= 100, "Liq 50-100");
        require(_lpLockTime > 0, "Lock time > 0");

        address routerToUse = _router == address(0) ? defaultRouter : _router;
        require(whitelistedRouters[routerToUse], "Router not whitelisted");

        // ----- Pay Fees (SOLT + BNB) -----
        soltToken.safeTransferFrom(msg.sender, treasuryWallet, SOLT_CREATION_FEE);
        require(msg.value >= bnbCreationFee, "BNB fee required");
        if (msg.value > bnbCreationFee) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - bnbCreationFee}("");
            require(ok, "Refund failed");
        }
        (bool ok, ) = payable(treasuryWallet).call{value: bnbCreationFee}("");
        require(ok, "Fee transfer failed");
        emit CreationFeePaid(msg.sender, SOLT_CREATION_FEE, bnbCreationFee);

        // Get KYC/Audit status
        bool userKyc = kycVerified[msg.sender];
        bool userAudit = auditVerified[_token];

        // Mark token as used
        tokenUsed[_token] = true;

        FairLaunch launch = new FairLaunch(
            msg.sender,
            _token,
            _softCap,
            _hardCap,
            _minBuy,
            _maxBuy,
            _startTime,
            _endTime,
            _claimStartTime,
            _listingRate,
            _liquidityPercent,
            _lpLockTime,
            _refundType,
            _whitelistEnabled,
            routerToUse,
            antiBotBlocks,
            platformFeePercent,
            platformFeeWallet,
            userKyc,
            userAudit,
            maxClaimDelay,
            address(this),
            slippagePercent
        );

        launchAddress = address(launch);
        uint256 launchId = totalLaunches++;

        launchIdToAddress[launchId] = launchAddress;
        creatorLaunches[msg.sender].push(launchId);
        isLaunch[launchAddress] = true;
        tokenToLaunch[_token] = launchAddress;

        emit FairLaunchCreated(
            launchId,
            launchAddress,
            msg.sender,
            _token,
            routerToUse,
            _softCap,
            _hardCap,
            _startTime,
            _endTime,
            userKyc,
            userAudit
        );
    }

    // ----- Called by launch contract on cancellation (onlyFactory) -----
    function resetTokenUsedFromLaunch(address _token) external onlyFactory {
        tokenUsed[_token] = false;
        tokenToLaunch[_token] = address(0); // FIXED: Reset tokenToLaunch as well
        emit TokenUsedReset(_token, false);
    }

    // ----- Manual reset (onlyOwner) -----
    function resetTokenUsed(address _token) external onlyOwner {
        tokenUsed[_token] = false;
        tokenToLaunch[_token] = address(0); // FIXED: Reset tokenToLaunch as well
        emit TokenUsedReset(_token, false);
    }

    // ----- Admin -----
    function setTreasuryWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid");
        treasuryWallet = _newWallet;
        emit TreasuryWalletUpdated(_newWallet);
    }

    function setDefaultRouter(address _newRouter) external onlyOwner {
        require(_newRouter != address(0), "Invalid");
        defaultRouter = _newRouter;
        whitelistedRouters[_newRouter] = true;
        emit DefaultRouterUpdated(_newRouter);
        emit RouterWhitelisted(_newRouter, true);
    }

    function setRouterWhitelist(address _router, bool _status) external onlyOwner {
        whitelistedRouters[_router] = _status;
        emit RouterWhitelisted(_router, _status);
    }

    function setPlatformFee(uint256 _newFee, address _wallet) external onlyOwner {
        require(_newFee <= 10, "Fee max 10%");
        require(_wallet != address(0), "Invalid wallet");
        platformFeePercent = _newFee;
        platformFeeWallet = _wallet;
        emit PlatformFeeUpdated(_newFee, _wallet);
    }

    function setBnbFee(uint256 _newFee) external onlyOwner {
        bnbCreationFee = _newFee;
        emit BnbFeeUpdated(_newFee);
    }

    function setMaxClaimDelay(uint256 _newDelay) external onlyOwner {
        require(_newDelay > 0 && _newDelay <= 365, "Delay 1-365 days");
        maxClaimDelay = _newDelay;
        emit MaxClaimDelayUpdated(_newDelay);
    }

    function setSlippagePercent(uint256 _newSlippage) external onlyOwner {
        require(_newSlippage > 0 && _newSlippage <= 20, "Slippage 1-20%");
        slippagePercent = _newSlippage;
        emit SlippagePercentUpdated(_newSlippage);
    }

    function setAntiBotBlocks(uint256 _blocks) external onlyOwner {
        antiBotBlocks = _blocks;
        emit AntiBotBlocksUpdated(_blocks);
    }

    // ----- KYC/Audit Registry -----
    function setKYC(address user, bool status) external onlyOwner {
        kycVerified[user] = status;
        emit KYCVerified(user, status);
    }

    function setAudit(address project, bool status) external onlyOwner {
        auditVerified[project] = status;
        emit AuditVerified(project, status);
    }

    // ----- Pause -----
    function pauseFactory() external onlyOwner { _pause(); }
    function unpauseFactory() external onlyOwner { _unpause(); }

    // ----- Views -----
    function getAllLaunches() external view returns (address[] memory) {
        address[] memory launches = new address[](totalLaunches);
        for (uint256 i = 0; i < totalLaunches; ) {
            launches[i] = launchIdToAddress[i];
            unchecked { ++i; }
        }
        return launches;
    }

    function getLaunchesByCreator(address creator) external view returns (address[] memory) {
        uint256[] memory ids = creatorLaunches[creator];
        address[] memory launches = new address[](ids.length);
        for (uint256 i = 0; i < ids.length; ) {
            launches[i] = launchIdToAddress[ids[i]];
            unchecked { ++i; }
        }
        return launches;
    }

    function getLaunchCount() external view returns (uint256) {
        return totalLaunches;
    }

    function getTokenLaunch(address _token) external view returns (address) {
        return tokenToLaunch[_token];
    }

    receive() external payable {}
}