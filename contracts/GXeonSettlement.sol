// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title GXeonSettlement
 * @dev Contrato de liquidação on-chain para o sistema GXEON
 * Gerencia saldos de usuários, flash loans e distribuição de lucros 70/30
 * 
 * Sistema de Monetização:
 * - 70% Reinvestimento Vault (para próximos flash loans)
 * - 30% Commander Payout (lucro direto para wallet do comandante)
 */
contract GXeonSettlement {
    address public owner;
    
    // Distribution percentages (in basis points, 10000 = 100%)
    uint256 public constant REINVESTMENT_PERCENT = 7000; // 70%
    uint256 public constant COMMANDER_PERCENT = 3000;      // 30%
    uint256 public constant BASIS_POINTS = 10000;
    
    // Mapping de userId (UUID em bytes32) => saldo disponível para saque
    mapping(bytes32 => uint256) public balances;
    
    // Revenue tracking por endereço do comandante
    mapping(address => uint256) public commanderRevenue;
    mapping(address => uint256) public totalClaimed;
    
    // Total revenue tracking
    uint256 public totalVaultRevenue;
    uint256 public totalCommanderRevenue;
    uint256 public totalFlashLoans;
    
    // Revenue history para analytics
    struct RevenueRecord {
        uint256 timestamp;
        uint256 grossProfit;
        uint256 vaultShare;
        uint256 commanderShare;
        string operationId;
    }
    
    mapping(uint256 => RevenueRecord) public revenueHistory;
    uint256 public revenueRecordCount;
    
    // Eventos
    event FundsDeposited(bytes32 indexed userId, uint256 amount);
    event FundsReleased(bytes32 indexed userId, uint256 amount, address recipient);
    event FundsLocked(bytes32 indexed userId, uint256 amount, string operationId);
    
    // Monetization events
    event ProfitDistributed(
        string indexed operationId,
        uint256 grossProfit,
        uint256 vaultShare,
        uint256 commanderShare,
        address indexed commander
    );
    
    event CommanderRevenueClaimed(
        address indexed commander,
        uint256 amount,
        uint256 timestamp
    );
    
    event FlashLoanExecuted(
        string indexed operationId,
        uint256 amount,
        uint256 profit,
        address indexed executor
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "GXeon: Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Deposita fundos para um usuário específico (apenas owner)
     * @param userId ID do usuário no formato bytes32
     */
    function depositFunds(bytes32 userId) external payable onlyOwner {
        require(msg.value > 0, "GXeon: Zero deposit");
        balances[userId] += msg.value;
        emit FundsDeposited(userId, msg.value);
    }
    
    /**
     * @dev Libera fundos para um usuário sacar (apenas owner)
     * @param userId ID do usuário
     * @param amount Quantidade a liberar (em wei)
     */
    function releaseFunds(bytes32 userId, uint256 amount) external onlyOwner {
        require(amount > 0, "GXeon: Zero amount");
        require(balances[userId] >= amount, "GXeon: Insufficient balance");
        
        balances[userId] -= amount;
        
        // Transferência para o owner (que gerencia a distribuição)
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "GXeon: Transfer failed");
        
        emit FundsReleased(userId, amount, owner);
    }
    
    /**
     * @dev Consulta saldo de um usuário
     * @param userId ID do usuário
     * @return Saldo em wei
     */
    function getBalance(bytes32 userId) external view returns (uint256) {
        return balances[userId];
    }
    
    /**
     * @dev Permite ao owner transferir ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "GXeon: Zero address");
        owner = newOwner;
    }
    
    /**
     * @dev Receber ETH diretamente no contrato
     */
    receive() external payable {
        emit FundsDeposited(bytes32(0), msg.value);
    }
    
    /**
     * @dev Distribui lucro de flash loan entre Vault (70%) e Comandante (30%)
     * @param grossProfit Lucro bruto do flash loan
     * @param commander Endereço do comandante que executou
     * @param operationId ID único da operação
     */
    function distributeProfit(
        uint256 grossProfit,
        address commander,
        string memory operationId
    ) external onlyOwner {
        require(grossProfit > 0, "GXeon: Zero profit");
        require(commander != address(0), "GXeon: Invalid commander");
        
        uint256 vaultShare = (grossProfit * REINVESTMENT_PERCENT) / BASIS_POINTS;
        uint256 commanderShare = (grossProfit * COMMANDER_PERCENT) / BASIS_POINTS;
        
        // Acumula revenue do comandante
        commanderRevenue[commander] += commanderShare;
        totalCommanderRevenue += commanderShare;
        totalVaultRevenue += vaultShare;
        totalFlashLoans++;
        
        // Registra no histórico
        revenueHistory[revenueRecordCount] = RevenueRecord({
            timestamp: block.timestamp,
            grossProfit: grossProfit,
            vaultShare: vaultShare,
            commanderShare: commanderShare,
            operationId: operationId
        });
        revenueRecordCount++;
        
        emit ProfitDistributed(operationId, grossProfit, vaultShare, commanderShare, commander);
    }
    
    // 🌑 GAS OPTIMIZATION CONFIGURATION
    uint256 public constant MIN_PROFIT_GAS_MULTIPLIER = 5; // Profit must be > 5x gas cost
    uint256 public constant ESTIMATED_GAS_COST = 0.002 ether; // ~$4-8 on Arbitrum
    
    /**
     * @dev Comandante saca seus lucros acumulados com otimização de gas
     * @param amount Quantidade a sacar (0 = sacar tudo)
     * @return amountClaimed Quantidade sacada
     * 
     * 💰 LÓGICA FINANCEIRA:
     * - Calcula 30% do Lucro Líquido (commanderShare)
     * - Só executa se lucro > 5x taxa de gas (gas optimization)
     * - Transfere para 0x3955d559055DadB7067054cB6E6f974710345224
     */
    function claimCommanderProfits(uint256 amount) external returns (uint256 amountClaimed) {
        uint256 available = commanderRevenue[msg.sender];
        require(available > 0, "GXeon: No revenue to claim");
        
        // 🛡️ GAS OPTIMIZATION: Só executa se o lucro for > 5x a taxa de gas
        uint256 minRequiredProfit = ESTIMATED_GAS_COST * MIN_PROFIT_GAS_MULTIPLIER;
        require(available >= minRequiredProfit, "GXeon: Profit below gas threshold (need 5x gas cost)");
        
        if (amount == 0 || amount > available) {
            amount = available;
        }
        
        commanderRevenue[msg.sender] -= amount;
        totalClaimed[msg.sender] += amount;
        
        // Transfer para o comandante (0x3955d559055DadB7067054cB6E6f974710345224)
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "GXeon: Transfer failed");
        
        emit CommanderRevenueClaimed(msg.sender, amount, block.timestamp);
        
        return amount;
    }
    
    /**
     * @dev Verifica se o claim está otimizado para gas (lucro > 5x gas)
     * @param commander Endereço do comandante
     * @return canClaim Se pode sacar
     * @return profitToGasRatio Razão lucro/gas (ideal > 5)
     */
    function canClaimOptimized(address commander) external view returns (bool canClaim, uint256 profitToGasRatio) {
        uint256 available = commanderRevenue[commander];
        if (available == 0) return (false, 0);
        
        uint256 minRequired = ESTIMATED_GAS_COST * MIN_PROFIT_GAS_MULTIPLIER;
        uint256 ratio = available / ESTIMATED_GAS_COST;
        
        return (available >= minRequired, ratio);
    }
    
    /**
     * @dev Consulta revenue acumulado do comandante
     * @param commander Endereço do comandante
     * @return totalAvailable Lucro disponível para saque
     * @return totalClaimedTotal Total já sacado
     */
    function getCommanderRevenue(address commander) 
        external 
        view 
        returns (uint256 totalAvailable, uint256 totalClaimedTotal) 
    {
        return (commanderRevenue[commander], totalClaimed[commander]);
    }
    
    /**
     * @dev Retorna estatísticas globais de revenue
     */
    function getGlobalStats() 
        external 
        view 
        returns (
            uint256 vaultRevenue,
            uint256 commanderRevenueTotal,
            uint256 flashLoans,
            uint256 operations
        ) 
    {
        return (totalVaultRevenue, totalCommanderRevenue, totalFlashLoans, revenueRecordCount);
    }
}
