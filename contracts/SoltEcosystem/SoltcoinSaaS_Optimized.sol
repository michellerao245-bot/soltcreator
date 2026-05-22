// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interfaces remain the same...
interface AggregatorV3Interface {
    function latestRoundData() external view returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
interface IPancakeRouter {
    function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

contract SoltcoinSaaS_Optimized is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Custom Errors (Saves huge space) ---
    error Inactive();
    error LimitExceeded();
    error LowTokens();
    error TransferFailed();

    IERC20 public immutable token;
    AggregatorV3Interface internal immutable priceFeed;
    IPancakeRouter public immutable pancakeRouter;
    address public treasuryWallet;

    struct Stage { uint256 priceUSD; uint256 supply; uint256 sold; }
    struct Purchase { uint256 amount; uint256 bnbPaid; uint256 releaseTime; bool claimed; bool refunded; }

    uint256 public currentStage = 1;
    uint256 public totalStages;
    uint256 public presaleEndTime;
    uint256 public totalReserved;
    bool public liquidityFinalized;
    bool public refundEnabled;
    bool public paused;

    uint256 public hardcapBNB;
    uint256 public minBuyUSD;
    uint256 public maxWalletUSD;
    uint256 public platformFeePercent = 2; 
    uint256 public liquidityPercent = 70; 
    uint256 public constant MAX_REF_LIMIT = 500000 * 1e18;

    mapping(uint256 => Stage) public stages;
    mapping(address => Purchase[]) public userPurchases;
    mapping(address => uint256) public userTotalSpentUSD;
    mapping(address => address) public referrers;
    mapping(address => uint256) public totalRefEarned;
    mapping(address => uint256) public nextClaimIndex;
    mapping(address => uint256) public nextRefundIndex;

    event TokensPurchased(address indexed buyer, uint256 amount, uint256 bnbSpent);
    event PresaleFinalized(uint256 bnbForLiq, uint256 bnbForTreasury);

    constructor(
        address _token, address _treasury, uint256 _hardcap, uint256 _min, uint256 _max, uint256 _days, uint256[] memory _prices, uint256[] memory _supplies
    ) Ownable(msg.sender) {
        token = IERC20(_token);
        treasuryWallet = _treasury;
        hardcapBNB = _hardcap;
        minBuyUSD = _min;
        maxWalletUSD = _max;
        presaleEndTime = block.timestamp + (_days * 1 days);
        totalStages = _prices.length;
        priceFeed = AggregatorV3Interface(0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE); 
        pancakeRouter = IPancakeRouter(0x10ED43C718714eb63d5aA57B78B54704E256024E);

        for(uint256 i = 0; i < _prices.length; i++) {
            stages[i+1] = Stage(_prices[i], _supplies[i], 0);
        }
    }

    function depositTokens(uint256 amount) external onlyOwner {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function buyTokens(address _referrer) public payable nonReentrant {
        if (paused || liquidityFinalized || refundEnabled || block.timestamp > presaleEndTime) revert Inactive();
        if (address(this).balance > hardcapBNB) revert LimitExceeded();

        uint256 bnbPrice = getLatestBNBPrice();
        uint256 usdValue = (msg.value * bnbPrice) / 1e18;
        if (usdValue < minBuyUSD || userTotalSpentUSD[msg.sender] + usdValue > maxWalletUSD) revert LimitExceeded();

        uint256 remainingUsd = usdValue;
        uint256 totalTokens;

        while (remainingUsd > 0 && currentStage <= totalStages) {
            Stage storage stage = stages[currentStage];
            uint256 stageCapUsd = ((stage.supply - stage.sold) * stage.priceUSD) / 1e18;
            if (remainingUsd <= stageCapUsd) {
                uint256 tokens = (remainingUsd * 1e18) / stage.priceUSD;
                totalTokens += tokens;
                stage.sold += tokens;
                remainingUsd = 0;
            } else {
                totalTokens += (stage.supply - stage.sold);
                remainingUsd -= stageCapUsd;
                stage.sold = stage.supply;
                currentStage++;
            }
        }
        if (remainingUsd > 0) revert LowTokens();

        uint256 bonus;
        if (_referrer != address(0) && _referrer != msg.sender) {
            if (referrers[msg.sender] == address(0)) referrers[msg.sender] = _referrer;
            address r = referrers[msg.sender];
            if (totalRefEarned[r] < MAX_REF_LIMIT) {
                bonus = (totalTokens * 5) / 100;
                if (totalRefEarned[r] + bonus > MAX_REF_LIMIT) bonus = MAX_REF_LIMIT - totalRefEarned[r];
                totalRefEarned[r] += bonus;
            }
        }

        if (token.balanceOf(address(this)) < totalReserved + totalTokens + bonus) revert LowTokens();

        userTotalSpentUSD[msg.sender] += usdValue;
        totalReserved += (totalTokens + bonus);
        userPurchases[msg.sender].push(Purchase(totalTokens, msg.value, block.timestamp + 120 days, false, false));
        if (bonus > 0) userPurchases[referrers[msg.sender]].push(Purchase(bonus, 0, block.timestamp + 120 days, false, false));

        emit TokensPurchased(msg.sender, totalTokens, msg.value);
        if(address(this).balance >= hardcapBNB) _finalize();
    }

    function finalize() external {
        if (msg.sender != owner() && block.timestamp <= presaleEndTime) revert Inactive();
        _finalize();
    }

    function _finalize() internal {
        if (liquidityFinalized || address(this).balance < 2 ether) return;
        liquidityFinalized = true;
        
        uint256 tBNB = address(this).balance;
        uint256 fee = (tBNB * platformFeePercent) / 100;
        uint256 liqBNB = ((tBNB - fee) * liquidityPercent) / 100;
        uint256 treasuryBNB = tBNB - fee - liqBNB;

        (bool s1,) = payable(owner()).call{value: fee}("");
        (bool s2,) = payable(treasuryWallet).call{value: treasuryBNB}("");
        if (!s1 || !s2) revert TransferFailed();

        uint256 tLiq = token.balanceOf(address(this)) - totalReserved;
        token.approve(address(pancakeRouter), tLiq);
        pancakeRouter.addLiquidityETH{value: liqBNB}(address(token), tLiq, 0, 0, address(0xdEaD), block.timestamp + 300);
        emit PresaleFinalized(liqBNB, treasuryBNB);
    }

    function claimRefund() external nonReentrant {
        if (!refundEnabled && !(block.timestamp > presaleEndTime + 3 days && !liquidityFinalized)) revert Inactive();
        uint256 amt;
        uint256 i = nextRefundIndex[msg.sender];
        uint256 pCount;
        while (i < userPurchases[msg.sender].length && pCount < 30) {
            Purchase storage p = userPurchases[msg.sender][i];
            if (!p.refunded && !p.claimed && p.bnbPaid > 0) {
                amt += p.bnbPaid;
                p.refunded = true;
                totalReserved -= p.amount;
            }
            i++; pCount++;
        }
        nextRefundIndex[msg.sender] = i;
        if (amt == 0) revert LowTokens();
        (bool s,) = payable(msg.sender).call{value: amt}("");
        if (!s) revert TransferFailed();
    }

    function claimTokens() public nonReentrant {
        if (refundEnabled) revert Inactive();
        uint256 c;
        uint256 i = nextClaimIndex[msg.sender];
        uint256 pCount;
        while (i < userPurchases[msg.sender].length && pCount < 50) {
            Purchase storage p = userPurchases[msg.sender][i];
            if (block.timestamp >= p.releaseTime && !p.claimed && !p.refunded) {
                c += p.amount;
                p.claimed = true;
            }
            i++; pCount++;
        }
        nextClaimIndex[msg.sender] = i;
        if (c == 0) revert LowTokens();
        totalReserved -= c;
        token.safeTransfer(msg.sender, c);
    }

    function getLatestBNBPrice() public view returns (uint256) {
        (,int price,,uint updatedAt,) = priceFeed.latestRoundData();
        if (price <= 0 || updatedAt == 0) revert Inactive();
        return uint256(price * 1e10);
    }

    function togglePause() external onlyOwner { paused = !paused; }
    function enableRefunds() external onlyOwner { refundEnabled = true; }
}