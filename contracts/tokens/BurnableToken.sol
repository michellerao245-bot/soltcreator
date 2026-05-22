// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BurnableToken
 * @dev Deflationary token for SoltDex. Includes custom burn events for backend analytics.
 */
contract BurnableToken is ERC20, ERC20Burnable, Ownable {
    uint8 private immutable _customDecimals;

    // --- Events for Backend Tracking ---
    event TokenCreated(address indexed owner, string name, string symbol, uint256 totalSupply, uint8 decimals);
    event TokensBurned(address indexed user, uint256 amount);

    constructor(
        string memory name, 
        string memory symbol, 
        uint256 supply, 
        uint8 decimals_, 
        address owner
    ) ERC20(name, symbol) Ownable(owner) {
        // --- Validations (The "Standard" logic) ---
        require(supply > 0, "Supply must be > 0");
        require(bytes(name).length > 0, "Name empty");
        require(bytes(symbol).length > 0, "Symbol empty");
        require(decimals_ <= 18, "Decimals cap: 18");
        require(owner != address(0), "Owner is zero");
        require(supply <= type(uint256).max / (10 ** uint256(decimals_)), "Supply overflow");

        uint256 mintedSupply = supply * (10 ** uint256(decimals_));
        require(mintedSupply <= 1e30, "Supply exceeds cap");

        _customDecimals = decimals_;
        _mint(owner, mintedSupply);

        emit TokenCreated(owner, name, symbol, mintedSupply, decimals_);
    }

    // --- Override Burn Functions for Analytics ---

    /**
     * @dev 🔸 Tracks direct burns for backend indexing.
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit TokensBurned(_msgSender(), amount);
    }

    /**
     * @dev 🔸 Tracks burns from allowed addresses for backend indexing.
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }

    /**
     * @dev Returns custom decimals for correct UI display.
     */
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}