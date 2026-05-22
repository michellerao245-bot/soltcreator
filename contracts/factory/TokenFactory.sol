// SPDX-License-Identifier: MIT  
pragma solidity ^0.8.20;  
  
import "./TokenRegistry.sol";  
import "../tokens/StandardToken.sol";  
import "../tokens/BurnableToken.sol";  
import "../tokens/FeeToken.sol";  
import "@openzeppelin/contracts/access/Ownable.sol";  
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";  
 
/**
 * @title TokenFactory
 * @dev SoltDex Master Factory - Deploys Standard, Burnable, and Fee Tokens.
 * Features: 6000 SOLT Fee, Tax Protection (10%), and Optimized UX.
 */
contract TokenFactory is Ownable {  
    event TokenCreated(address indexed owner, address indexed token, string tokenType);  
  
    TokenRegistry public immutable registry;  
    address public soltToken;  
    address public devWallet;  
    
    // 💰 Default Fees: 6000 SOLT (₹12,000 approx)
    uint256 public soltFee = 6000 * 1e18;  
      
    bool private locked;  
    modifier nonReentrant() {  
        require(!locked, "RE");  
        locked = true;  
        _;  
        locked = false;  
    }  
 
    constructor(address _registry, address _solt, address _dev) Ownable(msg.sender) {  
        require(_registry != address(0) && _solt != address(0) && _dev != address(0), "Zero Address");  
        registry = TokenRegistry(_registry);  
        soltToken = _solt;  
        devWallet = _dev;  
    }  
 
    /**
     * @dev Internal function to handle SOLT fee collection.
     * Ensures user has balance and has approved the factory.
     */
    function _collectFee() private { 
        // 1. Balance Check (Better UX)
        require(IERC20(soltToken).balanceOf(msg.sender) >= soltFee, "Low SOLT Balance"); 
        
        // 2. Allowance Check (Explicit error for Frontend)
        require(IERC20(soltToken).allowance(msg.sender, address(this)) >= soltFee, "Approve SOLT First"); 
        
        // 3. Optimized Transfer (Reverts automatically on failure)
        IERC20(soltToken).transferFrom(msg.sender, devWallet, soltFee); 
    } 
 
    // 1️⃣ CREATE STANDARD TOKEN
    function createStandardToken(string memory n, string memory s, uint256 sup, uint8 d) external nonReentrant {  
        _collectFee();  
        StandardToken t = new StandardToken(n, s, sup, d, msg.sender);  
        registry.registerToken(msg.sender, address(t));  
        emit TokenCreated(msg.sender, address(t), "Standard");  
    }  
 
    // 2️⃣ CREATE BURNABLE TOKEN
    function createBurnableToken(string memory n, string memory s, uint256 sup, uint8 d) external nonReentrant {  
        _collectFee();  
        BurnableToken t = new BurnableToken(n, s, sup, d, msg.sender);  
        registry.registerToken(msg.sender, address(t));  
        emit TokenCreated(msg.sender, address(t), "Burnable");  
    }  
 
    // 3️⃣ CREATE FEE TOKEN (Tax Token)
    function createFeeToken(string memory n, string memory s, uint256 sup, uint8 d, uint256 tax) external nonReentrant {  
        // 🛡️ Anti-Rug: Max 10% Tax Limit (1000 = 10.00%)
        require(tax <= 1000, "Max Tax 10%"); 
        
        _collectFee();  
        
        // Deployment with 7 arguments as per FeeToken.sol constructor
        FeeToken t = new FeeToken(n, s, sup, d, tax, devWallet, msg.sender);  
        
        registry.registerToken(msg.sender, address(t));  
        emit TokenCreated(msg.sender, address(t), "FeeToken");  
    }  
 
    // --- ADMIN FUNCTIONS ---

    /**
     * @dev Update fee amount. Input example: 5000 (will be 5000 * 10^18)
     */
    function setFees(uint256 _newFee) external onlyOwner {  
        soltFee = _newFee * 1e18;  
    }  
 
    /**
     * @dev Update SOLT token address or Revenue wallet.
     */
    function setWallets(address _solt, address _dev) external onlyOwner {  
        require(_solt != address(0) && _dev != address(0), "Zero Address");  
        soltToken = _solt;  
        devWallet = _dev;  
    }  
}