// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; 
import "@openzeppelin/contracts/access/Ownable.sol"; 
 
/** * @title FeeToken 
 * @dev SoltDex Master FeeToken - Final Audit Version with Anti-Whale, Tax & Event Fixes. 
 */ 
contract FeeToken is ERC20, Ownable { 
    uint8 private immutable _customDecimals; 
    uint256 public immutable taxFee; // 100 = 1% 
    address public immutable taxReceiver; 
    bool public taxEnabled = true; 

    // ✅ Anti-Whale Variables
    uint256 public maxWalletAmount; 
    mapping(address => bool) public isExcludedFromMaxWallet;
    mapping(address => bool) public isExcludedFromFee; 
 
    // --- Events (All Declared Properly) --- 
    event TokenCreated(address indexed owner, string name, string symbol, uint256 totalSupply, uint8 decimals); 
    event TaxPaid(address indexed from, address indexed to, uint256 amount); 
    event TaxStatusUpdated(bool enabled); // ✅ Fixed: Now Declared
    event MaxWalletUpdated(uint256 newAmount);
    event ExcludeUpdated(address indexed account, bool status);
    event ExcludeMaxWalletUpdated(address indexed account, bool status);
 
    constructor( 
        string memory name,  
        string memory symbol,  
        uint256 supply,  
        uint8 decimals_,  
        uint256 _taxFee,  
        address _taxReceiver,  
        address owner 
    ) ERC20(name, symbol) Ownable(owner) { 
        require(supply > 0, "Z1"); 
        require(_taxReceiver != address(0), "Z2"); 
        require(owner != address(0), "Z3"); 
        require(_taxFee <= 1000, "Max 10%"); 
 
        uint256 mintedSupply = supply * (10 ** uint256(decimals_)); 
        _customDecimals = decimals_; 
        taxFee = _taxFee; 
        taxReceiver = _taxReceiver; 

        // Default Max Wallet: 2%
        maxWalletAmount = (mintedSupply * 200) / 10000; 
 
        // Initial Exclusions
        isExcludedFromFee[owner] = true; 
        isExcludedFromFee[address(this)] = true; 
        isExcludedFromFee[_taxReceiver] = true; 
        
        isExcludedFromMaxWallet[owner] = true;
        isExcludedFromMaxWallet[address(this)] = true;
        isExcludedFromMaxWallet[_taxReceiver] = true;
        isExcludedFromMaxWallet[address(0)] = true; 
 
        _mint(owner, mintedSupply); 
        emit TokenCreated(owner, name, symbol, mintedSupply, decimals_); 
    } 
 
    /** * @dev Enhanced _update with Anti-Whale, Self-Transfer Skip & Tax logic. 
     */ 
    function _update(address from, address to, uint256 value) internal virtual override { 
        require(to != address(0), "Z0");

        // 1. Skip logic for Self-Transfers or Minting
        if (from == to || from == address(0)) {
            super._update(from, to, value);
            return;
        }

        uint256 taxAmount = 0;
        // 2. Tax Calculation
        if (taxEnabled && taxFee > 0 && !isExcludedFromFee[from] && !isExcludedFromFee[to]) { 
            taxAmount = (value * taxFee) / 10000; 
        }

        uint256 sendAmount = value - taxAmount;

        // 3. ✅ Anti-Whale Check
        if (!isExcludedFromMaxWallet[to]) {
            require(balanceOf(to) + sendAmount <= maxWalletAmount, "Max Wallet Exceeded");
        }

        // 4. Execute Transfers
        if (taxAmount > 0) {
            super._update(from, taxReceiver, taxAmount); 
            emit TaxPaid(from, taxReceiver, taxAmount);
        }
        
        super._update(from, to, sendAmount); 
    } 
 
    // --- Governance --- 

    function setMaxWallet(uint256 amount) external onlyOwner {
        require(amount >= totalSupply() / 1000, "Too low");
        maxWalletAmount = amount;
        emit MaxWalletUpdated(amount);
    }

    function setExcludeFromMaxWallet(address account, bool excluded) external onlyOwner {
        isExcludedFromMaxWallet[account] = excluded;
        emit ExcludeMaxWalletUpdated(account, excluded);
    }
 
    function setTaxStatus(bool _enabled) external onlyOwner { 
        taxEnabled = _enabled; 
        emit TaxStatusUpdated(_enabled); 
    } 
 
    function setExcludeFromFee(address account, bool excluded) external onlyOwner { 
        isExcludedFromFee[account] = excluded; 
        emit ExcludeUpdated(account, excluded); 
    } 
 
    function decimals() public view virtual override returns (uint8) { 
        return _customDecimals; 
    } 
}