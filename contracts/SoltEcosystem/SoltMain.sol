// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interfaces for PancakeSwap / DEX Integration
interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

// ==========================================
// 1. SOLT UTILITY TOKEN (PRO-HARDENED)
// ==========================================
contract Soltcoin is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10**18;
    uint256 public maxWallet = MAX_SUPPLY / 50; // Initial 2%
    
    bool public tradingEnabled = false;
    address public pair;
    address public router;

    mapping(address => bool) public isExempt;
    mapping(address => bool) public isAMM; 

    event TradingEnabled();
    event MaxWalletUpdated(uint256 newAmount);

    constructor(address _router) ERC20("Soltcoin", "SOLT") Ownable(msg.sender) {
        router = _router;
        
        isExempt[msg.sender] = true;
        isExempt[address(this)] = true;
        isExempt[_router] = true;

        _mint(msg.sender, 5_000_000_000 * 10**18);

        // Auto-create PancakeSwap Pair
        pair = IUniswapV2Factory(IUniswapV2Router02(_router).factory())
            .createPair(address(this), IUniswapV2Router02(_router).WETH());
        
        isAMM[pair] = true;
    }

    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "Already enabled");
        tradingEnabled = true;
        emit TradingEnabled();
    }

    function setMaxWallet(uint256 _amount) external onlyOwner {
        require(_amount >= MAX_SUPPLY / 1000, "Limit too low"); // Safety: at least 0.1%
        maxWallet = _amount;
        emit MaxWalletUpdated(_amount);
    }
    
    function setAMM(address _pair, bool _status) external onlyOwner { isAMM[_pair] = _status; }
    function setExempt(address _addr, bool _status) external onlyOwner { isExempt[_addr] = _status; }

    /**
     * @dev Optimized Transfer Logic with Zero-Address Safety
     */
    function _update(address from, address to, uint256 amount) internal override {
        // Zero address safety for burn/mint
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        if (!isExempt[from] && !isExempt[to]) {
            if (!tradingEnabled) revert("Trading Locked");
            
            // Max Wallet Protection
            if (!isAMM[to]) {
                if (balanceOf(to) + amount > maxWallet) revert("Exceeds Max Wallet");
            }
        }
        super._update(from, to, amount);
    }

    function rescueTokens(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(msg.sender, _amount);
    }

    function ecosystemMint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Cap Reached");
        _mint(to, amount);
    }
}

// ==========================================
// 2. STAKING ENGINE (INSTITUTIONAL MODEL)
// ==========================================
contract SoltStaking is ReentrancyGuard, Ownable {
    IERC20 public immutable soltToken;
    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => bool) public isRewardDistributor;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    constructor(address _token) Ownable(msg.sender) { soltToken = IERC20(_token); }

    modifier updateReward(address account) {
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function earned(address account) public view returns (uint256) {
        return (_balances[account] * (rewardPerTokenStored - userRewardPerTokenPaid[account]) / 1e18) + rewards[account];
    }

    function notifyRewardAmount(uint256 reward) external updateReward(address(0)) {
        require(isRewardDistributor[msg.sender] || msg.sender == owner(), "Unauthorized");
        if (_totalSupply > 0) {
            rewardPerTokenStored += (reward * 1e18) / _totalSupply;
        }
    }

    function setDistributor(address _dist, bool _status) external onlyOwner { isRewardDistributor[_dist] = _status; }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Amount must be > 0");
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        soltToken.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        uint256 amount = _balances[msg.sender];
        require(amount > 0, "No stake");
        rewards[msg.sender] = 0;
        _totalSupply -= amount;
        _balances[msg.sender] = 0;
        soltToken.transfer(msg.sender, amount + reward);
    }
}

// ==========================================
// 3. AUTOMATED FEE ENGINE (SPLITTER)
// ==========================================
contract SoltFeeEngine is Ownable, ReentrancyGuard {
    Soltcoin public soltToken;
    SoltStaking public stakingContract;
    address public treasury;
    uint256 public lastProcessed;
    uint256 public constant COOLDOWN = 1 hours;
    mapping(address => bool) public isKeeper;

    constructor(address _t, address _s, address _tr) Ownable(msg.sender) {
        soltToken = Soltcoin(_t);
        stakingContract = SoltStaking(_s);
        treasury = _tr;
    }

    function setKeeper(address _k, bool _s) external onlyOwner { isKeeper[_k] = _s; }

    function processFees() external nonReentrant {
        require(isKeeper[msg.sender] || msg.sender == owner(), "Unauthorized");
        require(block.timestamp >= lastProcessed + COOLDOWN, "Cooldown active");
        
        uint256 bal = soltToken.balanceOf(address(this));
        require(bal >= 100 * 10**18, "Min threshold not met"); 

        lastProcessed = block.timestamp;
        
        uint256 burnAmt = (bal * 50) / 100;
        uint256 stakeAmt = (bal * 30) / 100;
        uint256 treasuryAmt = bal - burnAmt - stakeAmt;

        soltToken.transfer(0x000000000000000000000000000000000000dEaD, burnAmt);
        soltToken.transfer(treasury, treasuryAmt);
        soltToken.transfer(address(stakingContract), stakeAmt);
        stakingContract.notifyRewardAmount(stakeAmt);
    }
}