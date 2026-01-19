// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FeeManager
 * @notice Manages management fees (1% annual) and performance fees (20% on profits)
 */
contract FeeManager is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    // Fee rates (basis points: 10000 = 100%)
    uint256 public constant MANAGEMENT_FEE_BPS = 100; // 1% annual
    uint256 public constant PERFORMANCE_FEE_BPS = 2000; // 20%
    
    // Treasury address for collecting fees
    address public treasury;

    // User balances tracking
    mapping(address => mapping(address => uint256)) public userBalances; // user => asset => balance
    mapping(address => mapping(address => uint256)) public userEntryValue; // user => asset => entry value in USD
    mapping(address => mapping(address => uint256)) public lastFeeTimestamp; // user => asset => last fee collection timestamp

    // Events
    event ManagementFeeCollected(address indexed user, address indexed asset, uint256 amount);
    event PerformanceFeeCollected(address indexed user, address indexed asset, uint256 profit, uint256 fee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _treasury) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        require(_treasury != address(0), "FeeManager: invalid treasury address");
        treasury = _treasury;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "FeeManager: invalid treasury address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @notice Record user deposit and take custody of tokens.
     */
    function recordDeposit(address user, address asset, uint256 amount, uint256 usdValue) external onlyOwner nonReentrant {
        require(user != address(0), "FeeManager: Invalid user");
        require(asset != address(0), "FeeManager: Invalid asset");
        require(amount > 0, "FeeManager: Amount must be > 0");

        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransferFrom(user, address(this), amount);
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));

        uint256 actualAmount = balanceAfter - balanceBefore;
        require(actualAmount > 0, "FeeManager: No tokens received");

        userBalances[user][asset] += actualAmount;
        // Adjust USD value proportionally if FOT occurred? 
        // Ideally yes, but oracle provides USD value of *attempted* amount usually.
        // For safety, we keep implicit 1:1 assumption for now, or just credit the balance.
        // Strictly speaking, we should adjust usdValue too: usdValue = usdValue * actualAmount / amount
        // But let's stick to safe crediting first.
        if (amount > actualAmount) {
             usdValue = (usdValue * actualAmount) / amount;
        }
        userEntryValue[user][asset] += usdValue;
        
        if (lastFeeTimestamp[user][asset] == 0) {
            lastFeeTimestamp[user][asset] = block.timestamp;
        }
    }

    /**
     * @notice Record user withdrawal and return tokens.
     */
    function recordWithdrawal(address user, address asset, uint256 amount) external onlyOwner nonReentrant {
        require(userBalances[user][asset] >= amount, "FeeManager: insufficient balance");
        
        userBalances[user][asset] -= amount;

        // Fixed: Actually return the tokens to the user
        IERC20(asset).safeTransfer(user, amount);
    }

    /**
     * @notice Calculate and collect management fee
     * @dev Management fee is 1% annual, calculated pro-rata
     */
    function collectManagementFee(address user, address asset) external onlyOwner nonReentrant returns (uint256) {
        uint256 balance = userBalances[user][asset];
        if (balance == 0) return 0;

        uint256 lastTimestamp = lastFeeTimestamp[user][asset];
        if (lastTimestamp == 0) return 0;

        uint256 timeElapsed = block.timestamp - lastTimestamp;
        uint256 annualFee = (balance * MANAGEMENT_FEE_BPS) / 10000;
        uint256 fee = (annualFee * timeElapsed) / 365 days;

        if (fee > 0 && fee <= balance) {
            IERC20(asset).safeTransfer(treasury, fee);
            userBalances[user][asset] -= fee;
            lastFeeTimestamp[user][asset] = block.timestamp;
            
            emit ManagementFeeCollected(user, asset, fee);
        }

        return fee;
    }

    /**
     * @notice Calculate and collect performance fee
     * @dev Performance fee is 20% of profits (current value - entry value)
     */
    function collectPerformanceFee(
        address user,
        address asset,
        uint256 currentValueUSD
    ) external onlyOwner nonReentrant returns (uint256) {
        uint256 entryValue = userEntryValue[user][asset];
        if (currentValueUSD <= entryValue) return 0; // No profit, no fee

        uint256 profit = currentValueUSD - entryValue;
        uint256 fee = (profit * PERFORMANCE_FEE_BPS) / 10000;

        // Update entry value to current value after fee
        userEntryValue[user][asset] = currentValueUSD - fee;

        emit PerformanceFeeCollected(user, asset, profit, fee);
        return fee;
    }

    /**
     * @notice Get user's total balance for an asset
     */
    function getUserBalance(address user, address asset) external view returns (uint256) {
        return userBalances[user][asset];
    }

    /**
     * @notice Get user's entry value for an asset
     */
    function getUserEntryValue(address user, address asset) external view returns (uint256) {
        return userEntryValue[user][asset];
    }
}

