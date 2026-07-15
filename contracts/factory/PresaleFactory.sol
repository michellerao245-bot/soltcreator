// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../Presale.sol";

contract PresaleFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    // -------------------- Custom Errors --------------------
    error ZeroAddress();
    error InsufficientFeeAllowance();
    error InsufficientFeeBalance();
    error InvalidFeeAmount();
    error InvalidPrice();
    error InvalidCaps();
    error InvalidMinMax();
    error InvalidTimestamps();
    error InvalidTGE();
    error PaymentTokenNotAllowed();
    error ActivePresaleExists();
    error NotERC20();
    error NoBalance();
    error NotAllowed();
    error InvalidOffset();
    error FeeTokenNotAllowed();

    // -------------------- Constants --------------------
    string public constant VERSION = "1.0.7";   // ✅ Updated

    // -------------------- Structs --------------------
    struct PresaleMetadata {
        address presaleAddress;
        address saleToken;
        address creator;
        address paymentToken;
        uint256 pricePerToken;
        uint256 softCap;
        uint256 hardCap;
        uint256 minBuy;
        uint256 maxBuy;
        uint256 startTime;
        uint256 endTime;
        bool whitelistEnabled;
        uint256 cliff;
        uint256 vestingDuration;
        uint256 tgePercent;
        bool finalized;
        bool cancelled;
    }

    // -------------------- State Variables -------------
    address public feeToken;
    uint256 public feeAmount;
    address public treasuryWallet;

    mapping(address => bool) public isFeeExempt;

    uint256 public presaleCount;
    mapping(uint256 => address) public presaleById;
    address[] public allPresales;
    mapping(address => bool) public isPresale;

    mapping(address => address[]) public creatorPresales;
    mapping(address => bool) public activePresale;
    mapping(uint256 => PresaleMetadata) public presaleMetadata;
    mapping(address => uint256) public presaleIdOf;

    EnumerableSet.AddressSet private allowedPaymentTokens;
    EnumerableSet.AddressSet private allowedFeeTokens;

    // -------------------- Events ----------------------
    event PresaleDeployed(
        uint256 indexed presaleId,
        address indexed presaleAddress,
        address indexed creator,
        address saleToken,
        address paymentToken,
        uint256 pricePerToken,
        uint256 softCap,
        uint256 hardCap,
        uint256 startTime,
        uint256 endTime,
        address feeToken,
        uint256 feeAmount
    );
    event FeeAmountUpdated(uint256 oldFee, uint256 newFee);
    event FeeTokenUpdated(address oldToken, address newToken);
    event TreasuryWalletUpdated(address oldWallet, address newWallet);
    event PaymentTokenAdded(address token);
    event PaymentTokenRemoved(address token);
    event FeeTokenAdded(address token);
    event FeeTokenRemoved(address token);
    event PresaleFinalized(uint256 indexed presaleId);
    event PresaleCancelled(uint256 indexed presaleId);
    event FeeExemptSet(address indexed user, bool status);

    // -------------------- Internal Validation --------------------
    function _validateERC20(address _token) internal view {
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(_token)
        }
        if (codeSize == 0) revert NotERC20();

        try IERC20Metadata(_token).totalSupply() returns (uint256) {
            // success
        } catch {
            revert NotERC20();
        }

        try IERC20Metadata(_token).decimals() returns (uint8) {
            // success
        } catch {
            revert NotERC20();
        }

        try IERC20Metadata(_token).symbol() returns (string memory) {
            // success
        } catch {
            revert NotERC20();
        }

        try IERC20Metadata(_token).name() returns (string memory) {
            // success
        } catch {
            revert NotERC20();
        }
    }

    // -------------------- Constructor -----------------
    constructor(
        address _treasuryWallet,
        address _feeToken,
        uint256 _feeAmount
    ) Ownable(msg.sender) {
        if (_treasuryWallet == address(0)) revert ZeroAddress();
        if (_feeToken == address(0)) revert ZeroAddress();
        if (_feeAmount == 0) revert InvalidFeeAmount();

        _validateERC20(_feeToken);

        treasuryWallet = _treasuryWallet;
        feeToken = _feeToken;
        feeAmount = _feeAmount;

        allowedFeeTokens.add(_feeToken);
    }

    // -------------------- Admin Functions --------------------
    function setFeeAmount(uint256 _newFee) external onlyOwner {
        if (_newFee == 0) revert InvalidFeeAmount();
        uint256 oldFee = feeAmount;
        feeAmount = _newFee;
        emit FeeAmountUpdated(oldFee, _newFee);
    }

    function setFeeToken(address _newToken) external onlyOwner {
        if (_newToken == address(0)) revert ZeroAddress();
        if (_newToken == feeToken) revert NotAllowed();
        if (!allowedFeeTokens.contains(_newToken)) revert FeeTokenNotAllowed();

        _validateERC20(_newToken);

        address oldToken = feeToken;
        feeToken = _newToken;
        emit FeeTokenUpdated(oldToken, _newToken);
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

    // ✅ addPaymentToken now validates ERC20
    function addPaymentToken(address _token) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        _validateERC20(_token);   // ✅ Added validation
        if (!allowedPaymentTokens.add(_token)) revert NotAllowed();
        emit PaymentTokenAdded(_token);
    }

    function removePaymentToken(address _token) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        if (!allowedPaymentTokens.remove(_token)) revert NotAllowed();
        emit PaymentTokenRemoved(_token);
    }

    function isPaymentTokenAllowed(address _token) public view returns (bool) {
        if (_token == address(0)) return true;
        return allowedPaymentTokens.contains(_token);
    }

    function isFeeTokenAllowed(address _token) public view returns (bool) {
        return allowedFeeTokens.contains(_token);
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

    // -------------------- Emergency -------------------
    function emergencyWithdrawERC20(address _token, address _to) external onlyOwner {
        if (_to == address(0)) revert ZeroAddress();
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) revert NoBalance();
        token.safeTransfer(_to, balance);
    }

    // -------------------- Factory Callbacks --------------
    function markFinalized(uint256 _presaleId) external {
        if (!isPresale[msg.sender]) revert NotAllowed();
        if (presaleById[_presaleId] != msg.sender) revert NotAllowed();

        PresaleMetadata storage meta = presaleMetadata[_presaleId];
        if (meta.finalized || meta.cancelled) revert NotAllowed();
        meta.finalized = true;
        activePresale[meta.saleToken] = false;
        emit PresaleFinalized(_presaleId);
    }

    function markCancelled(uint256 _presaleId) external {
        if (!isPresale[msg.sender]) revert NotAllowed();
        if (presaleById[_presaleId] != msg.sender) revert NotAllowed();

        PresaleMetadata storage meta = presaleMetadata[_presaleId];
        if (meta.finalized || meta.cancelled) revert NotAllowed();
        meta.cancelled = true;
        activePresale[meta.saleToken] = false;
        emit PresaleCancelled(_presaleId);
    }

    // -------------------- Core: Deploy Presale ---------
    function createPresale(
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
        uint256 _tgePercent
    ) external nonReentrant whenNotPaused {
        // ----- Validations -----
        if (_saleToken == address(0)) revert ZeroAddress();
        if (_pricePerToken == 0) revert InvalidPrice();
        if (_softCap > _hardCap || _hardCap == 0) revert InvalidCaps();
        if (_minBuy > _maxBuy || _minBuy == 0) revert InvalidMinMax();
        if (_startTime <= block.timestamp) revert InvalidTimestamps();
        if (_endTime <= _startTime) revert InvalidTimestamps();
        if (_tgePercent > 100) revert InvalidTGE();

        if (_vestingDuration == 0 && _cliff > 0) revert InvalidTimestamps();
        if (_vestingDuration > 0 && _cliff > _vestingDuration) revert InvalidTimestamps();

        if (!isPaymentTokenAllowed(_paymentToken)) revert PaymentTokenNotAllowed();
        if (activePresale[_saleToken]) revert ActivePresaleExists();

        _validateERC20(_saleToken);
        if (_paymentToken != address(0)) {
            _validateERC20(_paymentToken);
        }

        // ----- Fee Collection -----
        if (!isFeeExempt[msg.sender]) {
            IERC20 token = IERC20(feeToken);

            if (token.balanceOf(msg.sender) < feeAmount) {
                revert InsufficientFeeBalance();
            }
            if (token.allowance(msg.sender, address(this)) < feeAmount) {
                revert InsufficientFeeAllowance();
            }
            token.safeTransferFrom(msg.sender, treasuryWallet, feeAmount);
        }

        // Deploy new Presale
        presaleCount++;
        uint256 id = presaleCount;

        Presale newPresale = new Presale(
            _saleToken,
            _paymentToken,
            _pricePerToken,
            _softCap,
            _hardCap,
            _minBuy,
            _maxBuy,
            _startTime,
            _endTime,
            _whitelistEnabled,
            _cliff,
            _vestingDuration,
            _tgePercent,
            address(this),
            id
        );

        address presaleAddr = address(newPresale);

        // Register
        presaleById[id] = presaleAddr;
        allPresales.push(presaleAddr);
        isPresale[presaleAddr] = true;
        creatorPresales[msg.sender].push(presaleAddr);
        activePresale[_saleToken] = true;
        presaleIdOf[presaleAddr] = id;

        presaleMetadata[id] = PresaleMetadata({
            presaleAddress: presaleAddr,
            saleToken: _saleToken,
            creator: msg.sender,
            paymentToken: _paymentToken,
            pricePerToken: _pricePerToken,
            softCap: _softCap,
            hardCap: _hardCap,
            minBuy: _minBuy,
            maxBuy: _maxBuy,
            startTime: _startTime,
            endTime: _endTime,
            whitelistEnabled: _whitelistEnabled,
            cliff: _cliff,
            vestingDuration: _vestingDuration,
            tgePercent: _tgePercent,
            finalized: false,
            cancelled: false
        });

        newPresale.transferOwnership(msg.sender);

        emit PresaleDeployed(
            id,
            presaleAddr,
            msg.sender,
            _saleToken,
            _paymentToken,
            _pricePerToken,
            _softCap,
            _hardCap,
            _startTime,
            _endTime,
            feeToken,
            feeAmount
        );
    }

    // -------------------- View Functions --------------
    function getAllPresales() external view returns (address[] memory) {
        return allPresales;
    }

    function getPresales(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = allPresales.length;

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
            result[i] = allPresales[offset + i];
        }
        return result;
    }

    function totalPresales() external view returns (uint256) {
        return allPresales.length;
    }

    function getCreatorPresales(address _creator) external view returns (address[] memory) {
        return creatorPresales[_creator];
    }

    function creatorPresaleCount(address _user) external view returns (uint256) {
        return creatorPresales[_user].length;
    }

    function getCreatorPresalesMetadata(address _creator) external view returns (PresaleMetadata[] memory) {
        address[] memory addresses = creatorPresales[_creator];
        uint256 len = addresses.length;
        PresaleMetadata[] memory result = new PresaleMetadata[](len);
        for (uint256 i = 0; i < len; i++) {
            uint256 id = presaleIdOf[addresses[i]];
            result[i] = presaleMetadata[id];
        }
        return result;
    }

    function getPresaleMetadata(uint256 _id) external view returns (PresaleMetadata memory) {
        return presaleMetadata[_id];
    }

    function getAllowedPaymentTokens() external view returns (address[] memory) {
        return allowedPaymentTokens.values();
    }

    function getAllowedFeeTokens() external view returns (address[] memory) {
        return allowedFeeTokens.values();
    }
}