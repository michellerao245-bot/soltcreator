// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StandardToken
 * @dev Final Audit-Ready version for SoltDex Launchpad.
 * Optimized for Gas, Security, and Backend Indexing.
 */
contract StandardToken is ERC20, Ownable {
    uint8 private immutable _customDecimals;

    // 🔸 Event optimized for standard DEX/Explorer indexing
    event TokenCreated(
        address indexed owner,
        string name,
        string symbol,
        uint256 totalSupply, // Professional naming for explorers
        uint8 decimals
    );

    constructor(
        string memory name, 
        string memory symbol, 
        uint256 supply, 
        uint8 decimals_, 
        address owner
    ) ERC20(name, symbol) Ownable(owner) {
        // --- 1. Order Optimization (Check before Calc) ---
        require(supply > 0, "Supply must be > 0");
        require(bytes(name).length > 0, "Name empty");
        require(bytes(symbol).length > 0, "Symbol empty");
        require(decimals_ <= 18, "Decimals cap: 18");
        require(owner != address(0), "Owner is zero");
        
        // --- 2. Ultra-Pro Overflow Protection ---
        // Pre-checking the multiplication to prevent hidden revert
        require(supply <= type(uint256).max / (10 ** uint256(decimals_)), "Supply overflow");

        uint256 mintedSupply = supply * (10 ** uint256(decimals_));
        
        // --- 3. Ecosystem Safety Cap ---
        require(mintedSupply <= 1e30, "Supply exceeds ecosystem cap");

        _customDecimals = decimals_;
        _mint(owner, mintedSupply);

        // --- 4. Analytics Friendly Event ---
        emit TokenCreated(owner, name, symbol, mintedSupply, decimals_);
    }

    /**
     * @dev Overrides default 18 decimals. 
     * Essential for correct UI display in MetaMask/BscScan.
     */
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}