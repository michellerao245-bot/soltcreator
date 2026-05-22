// SPDX-License-Identifier: MIT  
pragma solidity ^0.8.20;  
  
import "@openzeppelin/contracts/access/Ownable.sol";  
  
/**
 * @title TokenRegistry
 * @dev SoltDex Database - Stores all tokens deployed via the Factory.
 * Features: Pagination, Duplicate Protection, and Contract Verification.
 */
contract TokenRegistry is Ownable {  
    event FactorySet(address indexed factory);  
    event TokenRegistered(address indexed owner, address indexed token);  
  
    address public factory;  
    bool public factorySet;  
  
    address[] public allTokens;  
    mapping(address => address[]) public userTokens;  
    mapping(address => bool) public isRegistered;  
  
    constructor() Ownable(msg.sender) {}  
  
    modifier onlyFactory() {  
        require(msg.sender == factory, "Access: Only Factory");  
        _;  
    }  
  
    /**
     * @dev Connects the Factory to the Registry. Can only be set ONCE for security.
     */
    function setFactory(address _factory) external onlyOwner {  
        require(!factorySet, "Security: Factory already linked");  
        require(_factory != address(0), "Error: Zero address");  
        factory = _factory;  
        factorySet = true;  
        emit FactorySet(_factory);  
    }  
  
    /**
     * @dev Registers a new token. Only the authorized Factory can call this.
     */
    function registerToken(address owner, address token) external onlyFactory {  
        require(owner != address(0), "Invalid owner");  
        require(token != address(0), "Invalid token");  
        require(!isRegistered[token], "Security: Duplicate entry");  
        
        // ✅ PRO POLISH: Ensure the address is a contract and not a wallet
        uint256 size;
        assembly { size := extcodesize(token) }
        require(size > 0, "Security: Not a contract");
       
        userTokens[owner].push(token);  
        allTokens.push(token);  
        isRegistered[token] = true;  
       
        emit TokenRegistered(owner, token);  
    }  
  
    // --- ⚡ PAGINATION (Global: For SoltDex Main Page) --- 
    function getTokens(uint256 start, uint256 limit) external view returns (address[] memory) {  
        uint256 total = allTokens.length;  
        if (start >= total) return new address[](0);  
        uint256 end = (start + limit > total) ? total : start + limit;  
        uint256 size = end - start;  
        address[] memory result = new address[](size);  
        for (uint256 i = 0; i < size; i++) result[i] = allTokens[start + i];  
        return result;  
    }  
  
    // --- ⚡ PAGINATION (User: For "My Tokens" Dashboard) --- 
    function getUserTokensPaginated(address user, uint256 start, uint256 limit) external view returns (address[] memory) {  
        uint256 total = userTokens[user].length;  
        if (start >= total) return new address[](0);  
        uint256 end = (start + limit > total) ? total : start + limit;  
        uint256 size = end - start;  
        address[] memory result = new address[](size);  
        for (uint256 i = 0; i < size; i++) result[i] = userTokens[user][start + i];  
        return result;  
    }  
  
    function getTotalTokens() external view returns (uint256) { return allTokens.length; }  
    function getUserTokenCount(address user) external view returns (uint256) { return userTokens[user].length; }  
}