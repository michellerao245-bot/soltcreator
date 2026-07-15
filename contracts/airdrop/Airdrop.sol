// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAirdropFactory {
    function updateAirdropStatus(uint256 airdropId, uint256 recipients, uint256 totalDistributed) external;
}

contract Airdrop is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // -------------------- Custom Errors --------------------
    error ZeroAddress();
    error InvalidAmount();
    error EmptyRecipients();
    error BatchTooLarge();
    error AlreadyExecuted();
    error NotExecuted();
    error InsufficientTokenBalance();
    error TransferFailed();
    error NothingToRescue();
    error CannotRescueAirdropToken();
    error NotAllowed();

    // -------------------- Events --------------------
    event AirdropExecuted(
        uint256 indexed airdropId,
        address indexed token,
        uint256 totalRecipients,
        uint256 totalDistributed,
        uint256 executedAt
    );
    event TokensDeposited(uint256 amount);
    event TokensRescued(address indexed token, address indexed to, uint256 amount);
    event NativeRescued(address indexed to, uint256 amount);

    // -------------------- State Variables --------------------
    IERC20 public immutable token;
    uint256 public immutable airdropId;
    IAirdropFactory public immutable factory;
    bool public executed;
    uint256 public totalRecipients;
    uint256 public totalDistributed;
    uint256 public createdAt;
    uint256 public constant MAX_BATCH_SIZE = 250;

    // -------------------- Constructor --------------------
    constructor(
        address _token,
        uint256 _airdropId,
        address _factory
    ) Ownable(msg.sender) {
        if (_token == address(0)) revert ZeroAddress();
        if (_factory == address(0)) revert ZeroAddress();

        token = IERC20(_token);
        airdropId = _airdropId;
        factory = IAirdropFactory(_factory);
        executed = false;
        totalRecipients = 0;
        totalDistributed = 0;
        createdAt = block.timestamp;
    }

    // -------------------- Deposit Tokens --------------------
    function depositTokens(uint256 _amount) external onlyOwner {
        if (_amount == 0) revert InvalidAmount();
        token.safeTransferFrom(msg.sender, address(this), _amount);
        emit TokensDeposited(_amount);
    }

    // -------------------- Execute Airdrop (Equal Amount) --------------------
    function executeEqualAirdrop(
        address[] calldata _recipients,
        uint256 _amountPerRecipient
    ) external onlyOwner nonReentrant whenNotPaused {
        if (executed) revert AlreadyExecuted();
        if (_recipients.length == 0) revert EmptyRecipients();
        if (_recipients.length > MAX_BATCH_SIZE) revert BatchTooLarge();
        if (_amountPerRecipient == 0) revert InvalidAmount();

        uint256 total = _recipients.length * _amountPerRecipient;
        if (total > token.balanceOf(address(this))) revert InsufficientTokenBalance();

        // Duplicate check removed – frontend handles deduplication
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (_recipients[i] == address(0)) revert ZeroAddress();
            token.safeTransfer(_recipients[i], _amountPerRecipient);
        }

        executed = true;
        totalRecipients = _recipients.length;
        totalDistributed = total;

        factory.updateAirdropStatus(airdropId, _recipients.length, total);

        emit AirdropExecuted(airdropId, address(token), _recipients.length, total, block.timestamp);
    }

    // -------------------- Execute Airdrop (Different Amounts) --------------------
    function executeCustomAirdrop(
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external onlyOwner nonReentrant whenNotPaused {
        if (executed) revert AlreadyExecuted();
        if (_recipients.length == 0) revert EmptyRecipients();
        if (_recipients.length > MAX_BATCH_SIZE) revert BatchTooLarge();
        if (_recipients.length != _amounts.length) revert InvalidAmount();

        uint256 total = 0;
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (_recipients[i] == address(0)) revert ZeroAddress();
            if (_amounts[i] == 0) revert InvalidAmount();
            total += _amounts[i];
        }

        if (total > token.balanceOf(address(this))) revert InsufficientTokenBalance();

        for (uint256 i = 0; i < _recipients.length; i++) {
            token.safeTransfer(_recipients[i], _amounts[i]);
        }

        executed = true;
        totalRecipients = _recipients.length;
        totalDistributed = total;

        factory.updateAirdropStatus(airdropId, _recipients.length, total);

        emit AirdropExecuted(airdropId, address(token), _recipients.length, total, block.timestamp);
    }

    // -------------------- Rescue Accidental Tokens --------------------
    function rescueERC20(address _token, address _to) external onlyOwner nonReentrant {
        if (_to == address(0)) revert ZeroAddress();
        if (_token == address(token)) revert CannotRescueAirdropToken();

        IERC20 erc20 = IERC20(_token);
        uint256 balance = erc20.balanceOf(address(this));
        if (balance == 0) revert NothingToRescue();

        erc20.safeTransfer(_to, balance);
        emit TokensRescued(_token, _to, balance);
    }

    // -------------------- Rescue Native Tokens (BNB/ETH) --------------------
    function rescueNative(address payable _to) external onlyOwner nonReentrant {
        if (_to == address(0)) revert ZeroAddress();
        uint256 balance = address(this).balance;
        if (balance == 0) revert NothingToRescue();

        (bool sent, ) = _to.call{value: balance}("");
        if (!sent) revert TransferFailed();
        emit NativeRescued(_to, balance);
    }

    // -------------------- View Functions --------------------
    function getAirdropInfo()
        external
        view
        returns (
            address tokenAddress,
            uint256 id,
            bool isExecuted,
            uint256 recipientsCount,
            uint256 distributedAmount,
            uint256 creationTime,
            uint256 balance
        )
    {
        return (
            address(token),
            airdropId,
            executed,
            totalRecipients,
            totalDistributed,
            createdAt,
            token.balanceOf(address(this))
        );
    }

    // -------------------- Pause/Unpause --------------------
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function renounceOwnership() public override onlyOwner {
        revert NotAllowed();
    }

    receive() external payable {}
}