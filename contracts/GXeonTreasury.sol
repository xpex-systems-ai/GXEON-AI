// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * 🏦 GXEON TREASURY
 * 
 * Central vault for all GXEON revenue streams.
 * Receives funds from:
 * - API calls (0.05 credits → converted to crypto)
 * - Flash loan tax (0.01%)
 * - Chainlink Functions fees (0.1 LINK)
 * - Ocean Protocol data sales
 * 
 * Distribution: 70% reinvestment / 30% commander
 */

contract GXeonTreasury is Ownable, ReentrancyGuard {
    
    // ============================================================
    // State Variables
    // ============================================================
    
    // Commander address (30% share)
    address public commander;
    
    // Revenue splits (basis points: 100 = 1%)
    uint256 public constant COMMANDER_SHARE_BPS = 3000; // 30%
    uint256 public constant VAULT_SHARE_BPS = 7000;     // 70%
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Minimum amounts for settlement
    uint256 public minSettlementEth = 0.01 ether;       // ~$25
    uint256 public minSettlementUsdc = 25 * 10**6;        // $25 USDC (6 decimals)
    
    // Token addresses
    address public constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;  // Arbitrum WETH
    address public constant USDC = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;  // Arbitrum USDC
    address public constant OCEAN = 0xF26c6C93D73fFdeE0cA4B88c5FfE6f1b85AC72f8; // Arbitrum OCEAN
    address public constant LINK = 0xf97f4df75117a78c1A5a0DBb814Af92458539FB4;  // Arbitrum LINK
    
    // Statistics
    uint256 public totalEthReceived;
    uint256 public totalUsdcReceived;
    uint256 public totalSettlements;
    
    // Pending distributions
    uint256 public pendingCommanderShare;
    uint256 public pendingVaultShare;
    
    // ============================================================
    // Structs
    // ============================================================
    
    struct RevenueStream {
        string name;
        uint256 totalReceived;
        uint256 lastDeposit;
        uint256 depositCount;
    }
    
    struct Settlement {
        uint256 timestamp;
        uint256 grossAmount;
        uint256 commanderShare;
        uint256 vaultShare;
        address token;
        string operationId;
    }
    
    // ============================================================
    // Mappings
    // ============================================================
    
    mapping(string => RevenueStream) public revenueStreams;
    mapping(uint256 => Settlement) public settlements;
    mapping(address => bool) public authorizedDepositors;
    
    string[] public streamNames;
    uint256 public settlementCount;
    
    // ============================================================
    // Events
    // ============================================================
    
    event Deposit(
        string indexed stream,
        address indexed token,
        uint256 amount,
        string metadata
    );
    
    event SettlementExecuted(
        uint256 indexed settlementId,
        uint256 grossAmount,
        uint256 commanderShare,
        uint256 vaultShare,
        address token
    );
    
    event CommanderShareWithdrawn(
        address indexed to,
        uint256 amount,
        address token
    );
    
    event VaultReinvestment(
        uint256 amount,
        address token,
        string strategy
    );
    
    event AuthorizedDepositorAdded(address depositor);
    event AuthorizedDepositorRemoved(address depositor);
    event MinSettlementUpdated(uint256 ethAmount, uint256 usdcAmount);
    
    // ============================================================
    // Constructor
    // ============================================================
    
    constructor(address _commander) Ownable(msg.sender) {
        require(_commander != address(0), "GXEON: Invalid commander address");
        commander = _commander;
        
        // Initialize revenue streams
        streamNames = ["api_calls", "flash_loan_tax", "chainlink_fees", "ocean_sales", "subscriptions"];
        
        for (uint i = 0; i < streamNames.length; i++) {
            revenueStreams[streamNames[i]] = RevenueStream({
                name: streamNames[i],
                totalReceived: 0,
                lastDeposit: 0,
                depositCount: 0
            });
        }
        
        // Owner is authorized depositor by default
        authorizedDepositors[msg.sender] = true;
    }
    
    // ============================================================
    // Deposit Functions
    // ============================================================
    
    /**
     * @notice Deposit ETH from API calls revenue
     * @param operationId Unique operation identifier
     */
    function depositApiRevenue(string calldata operationId) external payable nonReentrant {
        require(msg.value > 0, "GXEON: Zero deposit");
        require(authorizedDepositors[msg.sender], "GXEON: Unauthorized depositor");
        
        _processDeposit("api_calls", address(0), msg.value, operationId);
    }
    
    /**
     * @notice Deposit flash loan tax
     * @param operationId Flash loan operation identifier
     */
    function depositFlashLoanTax(string calldata operationId) external payable nonReentrant {
        require(msg.value > 0, "GXEON: Zero deposit");
        require(authorizedDepositors[msg.sender], "GXEON: Unauthorized depositor");
        
        _processDeposit("flash_loan_tax", address(0), msg.value, operationId);
    }
    
    /**
     * @notice Deposit ERC20 tokens (USDC, OCEAN, LINK, etc.)
     * @param token Token contract address
     * @param amount Amount to deposit
     * @param stream Revenue stream name
     * @param operationId Operation identifier
     */
    function depositERC20(
        address token,
        uint256 amount,
        string calldata stream,
        string calldata operationId
    ) external nonReentrant {
        require(amount > 0, "GXEON: Zero deposit");
        require(authorizedDepositors[msg.sender], "GXEON: Unauthorized depositor");
        require(_isValidStream(stream), "GXEON: Invalid revenue stream");
        
        // Transfer tokens from sender
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "GXEON: Token transfer failed");
        
        _processDeposit(stream, token, amount, operationId);
    }
    
    /**
     * @notice Receive external payments (Chainlink, Ocean, etc.)
     */
    function receiveExternalRevenue(
        string calldata stream
    ) external payable nonReentrant {
        require(msg.value > 0, "GXEON: Zero deposit");
        
        _processDeposit(stream, address(0), msg.value, "external");
    }
    
    // ============================================================
    // Settlement Functions
    // ============================================================
    
    /**
     * @notice Execute settlement when threshold is reached
     * @param token Address of token to settle (address(0) for ETH)
     */
    function executeSettlement(address token) external onlyOwner nonReentrant {
        uint256 balance = token == address(0) 
            ? address(this).balance - pendingCommanderShare - pendingVaultShare
            : IERC20(token).balanceOf(address(this));
        
        // Check minimum settlement
        if (token == address(0)) {
            require(balance >= minSettlementEth, "GXEON: Below min ETH settlement");
        } else if (token == USDC) {
            require(balance >= minSettlementUsdc, "GXEON: Below min USDC settlement");
        }
        
        require(balance > 0, "GXEON: Zero balance");
        
        // Calculate shares
        uint256 commanderShare = (balance * COMMANDER_SHARE_BPS) / BPS_DENOMINATOR;
        uint256 vaultShare = balance - commanderShare;
        
        // Update pending amounts
        pendingCommanderShare += commanderShare;
        pendingVaultShare += vaultShare;
        
        // Record settlement
        settlementCount++;
        settlements[settlementCount] = Settlement({
            timestamp: block.timestamp,
            grossAmount: balance,
            commanderShare: commanderShare,
            vaultShare: vaultShare,
            token: token,
            operationId: string(abi.encodePacked("settlement_", block.timestamp))
        });
        
        totalSettlements++;
        
        emit SettlementExecuted(
            settlementCount,
            balance,
            commanderShare,
            vaultShare,
            token
        );
    }
    
    /**
     * @notice Withdraw commander share (only commander)
     * @param token Address of token to withdraw (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function withdrawCommanderShare(
        address token,
        uint256 amount
    ) external nonReentrant {
        require(msg.sender == commander, "GXEON: Only commander");
        require(amount <= pendingCommanderShare, "GXEON: Insufficient pending share");
        
        pendingCommanderShare -= amount;
        
        if (token == address(0)) {
            (bool success, ) = commander.call{value: amount}("");
            require(success, "GXEON: ETH transfer failed");
        } else {
            bool success = IERC20(token).transfer(commander, amount);
            require(success, "GXEON: Token transfer failed");
        }
        
        emit CommanderShareWithdrawn(commander, amount, token);
    }
    
    /**
     * @notice Reinvest vault share (only owner)
     * @param token Token to reinvest
     * @param amount Amount to reinvest
     * @param strategy Description of reinvestment strategy
     */
    function reinvestVaultShare(
        address token,
        uint256 amount,
        string calldata strategy
    ) external onlyOwner nonReentrant {
        require(amount <= pendingVaultShare, "GXEON: Insufficient vault share");
        
        pendingVaultShare -= amount;
        
        // In production, this would interact with yield protocols
        // For now, just emit event
        emit VaultReinvestment(amount, token, strategy);
    }
    
    // ============================================================
    // Internal Functions
    // ============================================================
    
    function _processDeposit(
        string memory stream,
        address token,
        uint256 amount,
        string memory operationId
    ) internal {
        RevenueStream storage revenue = revenueStreams[stream];
        
        revenue.totalReceived += amount;
        revenue.lastDeposit = block.timestamp;
        revenue.depositCount++;
        
        if (token == address(0)) {
            totalEthReceived += amount;
        } else if (token == USDC) {
            totalUsdcReceived += amount;
        }
        
        emit Deposit(stream, token, amount, operationId);
    }
    
    function _isValidStream(string memory stream) internal view returns (bool) {
        for (uint i = 0; i < streamNames.length; i++) {
            if (keccak256(bytes(streamNames[i])) == keccak256(bytes(stream))) {
                return true;
            }
        }
        return false;
    }
    
    // ============================================================
    // View Functions
    // ============================================================
    
    function getTreasuryBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }
    
    function getRevenueStream(string calldata stream) external view returns (RevenueStream memory) {
        return revenueStreams[stream];
    }
    
    function getAllRevenueStreams() external view returns (RevenueStream[] memory) {
        RevenueStream[] memory streams = new RevenueStream[](streamNames.length);
        for (uint i = 0; i < streamNames.length; i++) {
            streams[i] = revenueStreams[streamNames[i]];
        }
        return streams;
    }
    
    function getPendingDistribution() external view returns (
        uint256 commanderPending,
        uint256 vaultPending
    ) {
        return (pendingCommanderShare, pendingVaultShare);
    }
    
    function getStats() external view returns (
        uint256 ethReceived,
        uint256 usdcReceived,
        uint256 settlements,
        uint256 commanderPending,
        uint256 vaultPending
    ) {
        return (
            totalEthReceived,
            totalUsdcReceived,
            totalSettlements,
            pendingCommanderShare,
            pendingVaultShare
        );
    }
    
    // ============================================================
    // Admin Functions
    // ============================================================
    
    function addAuthorizedDepositor(address depositor) external onlyOwner {
        authorizedDepositors[depositor] = true;
        emit AuthorizedDepositorAdded(depositor);
    }
    
    function removeAuthorizedDepositor(address depositor) external onlyOwner {
        authorizedDepositors[depositor] = false;
        emit AuthorizedDepositorRemoved(depositor);
    }
    
    function setCommander(address newCommander) external onlyOwner {
        require(newCommander != address(0), "GXEON: Invalid address");
        commander = newCommander;
    }
    
    function setMinSettlement(
        uint256 ethAmount,
        uint256 usdcAmount
    ) external onlyOwner {
        minSettlementEth = ethAmount;
        minSettlementUsdc = usdcAmount;
        emit MinSettlementUpdated(ethAmount, usdcAmount);
    }
    
    function addRevenueStream(string calldata streamName) external onlyOwner {
        require(bytes(revenueStreams[streamName].name).length == 0, "GXEON: Stream exists");
        
        streamNames.push(streamName);
        revenueStreams[streamName] = RevenueStream({
            name: streamName,
            totalReceived: 0,
            lastDeposit: 0,
            depositCount: 0
        });
    }
    
    // ============================================================
    // Emergency Functions
    // ============================================================
    
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "GXEON: Invalid recipient");
        
        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "GXEON: ETH withdrawal failed");
        } else {
            bool success = IERC20(token).transfer(to, amount);
            require(success, "GXEON: Token withdrawal failed");
        }
    }
    
    // ============================================================
    // Fallback
    // ============================================================
    
    receive() external payable {
        // Accept ETH deposits
        emit Deposit("direct", address(0), msg.value, "receive");
    }
    
    fallback() external payable {
        revert("GXEON: Direct calls not supported");
    }
}
