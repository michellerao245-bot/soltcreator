// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../airdrop/Airdrop.sol";

contract AirdropFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    // -------------------- Custom Errors --------------------
    error ZeroAddress();
    error InsufficientFeeAllowance();
    error InsufficientFeeBalance();
    error InsufficientFeeNative();
    error InvalidFeeAmount();
    error NotERC20();
    error NoBalance();
    error NotAllowed();
    error InvalidOffset();
    error AirdropNotFound();

    // -------------------- Constants --------------------
    string public constant VERSION = "1.0.0";

    // -------------------- Enums --------------------
    enum PaymentMethod { Native, ERC20 }

    // -------------------- Structs --------------------
    struct AirdropMetadata {
        address airdropAddress;
        address token;
        address creator;
        uint256 createdAt;
        bool executed;
        uint256 totalRecipients;
        uint256 totalDistributed;
    }

    // -------------------- State Variables --------------------
    address public feeToken;
    uint256 public feeAmount;
    address public treasuryWallet;

    mapping(address => bool) public isFeeExempt;

    uint256 public airdropCount;
    mapping(uint256 => address) public airdropById;
    address[] public allAirdrops;
    mapping(address => bool) public isAirdrop;

    mapping(address => address[]) public creatorAirdrops;
    mapping(uint256 => AirdropMetadata) public airdropMetadata;

    // ✅ New: Map address to ID for getAirdropMetadataByAddress
    mapping(address => uint256) public airdropIdOf;

    EnumerableSet.AddressSet private allowedFeeTokens;
    bool public nativeFeeEnabled;

    // -------------------- Events --------------------
    event AirdropDeployed(
        uint256 indexed airdropId,
        address indexed airdropAddress,
        address indexed creator,
        address token,
        uint256 createdAt,
        address feeToken,
        uint256 feeAmount,
        PaymentMethod paymentMethod
    );
    event FeeAmountUpdated(uint256 oldFee, uint256 newFee);
    event FeeTokenUpdated(address oldToken, address newToken);
    event TreasuryWalletUpdated(address oldWallet, address newWallet);
    event FeeTokenAdded(address token);
    event FeeTokenRemoved(address token);
    event FeeExemptSet(address indexed user, bool status);
    event NativeFeeEnabled(bool enabled);
    event AirdropExecuted(uint256 indexed airdropId, uint256 recipients, uint256 totalDistributed);

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

        try IERC20(_token).balanceOf(address(this)) returns (uint256) {
            // success
        } catch {
            revert NotERC20();
        }
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

    function emergencyWithdrawNative(address payable _to) external onlyOwner {
        if (_to == address(0)) revert ZeroAddress();
        uint256 balance = address(this).balance;
        if (balance == 0) revert NoBalance();
        (bool sent, ) = _to.call{value: balance}("");
        if (!sent) revert NotAllowed();
    }

    // -------------------- Core: Deploy Airdrop --------------------
    function createAirdrop(
        address _token,
        PaymentMethod _paymentMethod
    ) external payable nonReentrant whenNotPaused returns (address) {
        if (_token == address(0)) revert ZeroAddress();
        _validateERC20(_token);

        // ----- Fee Collection -----
        if (!isFeeExempt[msg.sender]) {
            if (_paymentMethod == PaymentMethod.Native) {
                if (!nativeFeeEnabled) revert NotAllowed();
                if (msg.value < feeAmount) revert InsufficientFeeNative();

                uint256 refund = msg.value - feeAmount;
                if (refund > 0) {
                    (bool sent, ) = payable(msg.sender).call{value: refund}("");
                    if (!sent) revert NotAllowed();
                }

                (bool sent, ) = treasuryWallet.call{value: feeAmount}("");
                if (!sent) revert NotAllowed();

            } else if (_paymentMethod == PaymentMethod.ERC20) {
                if (feeToken == address(0)) revert NotAllowed();
                IERC20 token = IERC20(feeToken);
                if (token.balanceOf(msg.sender) < feeAmount) {
                    revert InsufficientFeeBalance();
                }
                if (token.allowance(msg.sender, address(this)) < feeAmount) {
                    revert InsufficientFeeAllowance();
                }
                token.safeTransferFrom(msg.sender, treasuryWallet, feeAmount);
            } else {
                revert NotAllowed();
            }
        }

        // ----- Deploy Airdrop -----
        airdropCount++;
        uint256 id = airdropCount;

        Airdrop newAirdrop = new Airdrop(
            _token,
            id,
            address(this)
        );

        address airdropAddress = address(newAirdrop);

        // ----- Register -----
        airdropById[id] = airdropAddress;
        allAirdrops.push(airdropAddress);
        isAirdrop[airdropAddress] = true;
        creatorAirdrops[msg.sender].push(airdropAddress);
        airdropIdOf[airdropAddress] = id;   // ✅ For getAirdropMetadataByAddress

        airdropMetadata[id] = AirdropMetadata({
            airdropAddress: airdropAddress,
            token: _token,
            creator: msg.sender,
            createdAt: block.timestamp,
            executed: false,
            totalRecipients: 0,
            totalDistributed: 0
        });

        // Transfer ownership to creator
        newAirdrop.transferOwnership(msg.sender);

        emit AirdropDeployed(
            id,
            airdropAddress,
            msg.sender,
            _token,
            block.timestamp,
            feeToken,
            feeAmount,
            _paymentMethod
        );

        return airdropAddress;
    }

    // -------------------- Metadata Update Callback (called by Airdrop) --------------------
    function updateAirdropStatus(
        uint256 _airdropId,
        uint256 _recipients,
        uint256 _totalDistributed
    ) external {
        if (!isAirdrop[msg.sender]) revert NotAllowed();
        if (airdropById[_airdropId] != msg.sender) revert NotAllowed();

        AirdropMetadata storage meta = airdropMetadata[_airdropId];
        meta.executed = true;
        meta.totalRecipients = _recipients;
        meta.totalDistributed = _totalDistributed;

        emit AirdropExecuted(_airdropId, _recipients, _totalDistributed);
    }

    // -------------------- View Functions --------------------
    function getAllAirdrops() external view returns (address[] memory) {
        return allAirdrops;
    }

    function getAirdrops(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = allAirdrops.length;

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
            result[i] = allAirdrops[offset + i];
        }
        return result;
    }

    function totalAirdrops() external view returns (uint256) {
        return allAirdrops.length;
    }

    function getCreatorAirdrops(address _creator) external view returns (address[] memory) {
        return creatorAirdrops[_creator];
    }

    function getCreatorAirdropCount(address _creator) external view returns (uint256) {
        return creatorAirdrops[_creator].length;
    }

    function getAirdropAddress(uint256 _airdropId) external view returns (address) {
        address airdrop = airdropById[_airdropId];
        if (airdrop == address(0)) revert AirdropNotFound();
        return airdrop;
    }

    function getAirdropMetadata(uint256 _airdropId) external view returns (AirdropMetadata memory) {
        if (airdropById[_airdropId] == address(0)) revert AirdropNotFound();
        return airdropMetadata[_airdropId];
    }

    // ✅ Fixed: Properly implemented using airdropIdOf mapping
    function getAirdropMetadataByAddress(address _airdrop) external view returns (AirdropMetadata memory) {
        if (!isAirdrop[_airdrop]) revert AirdropNotFound();
        uint256 id = airdropIdOf[_airdrop];
        return airdropMetadata[id];
    }

    // -------------------- Additional View Helpers --------------------
    function getAllowedFeeTokens() external view returns (address[] memory) {
        return allowedFeeTokens.values();
    }

    function isFeeTokenAllowed(address _token) external view returns (bool) {
        return allowedFeeTokens.contains(_token);
    }

    receive() external payable {
        revert();
    }
}