// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title GXeonMainnetVault
 * @dev Vault production para Arbitrum One com Aave V3 e distribuição 70/30
 * 
 * Sistema de Monetização:
 * - 70% Reinvestimento no Vault (compounding)
 * - 30% Payout direto ao Comandante
 * 
 * Integrações:
 * - Aave V3 Flash Loans
 * - USDC nativo (6 decimais)
 * - Chainlink Price Feeds
 */

import {IPool, IPoolAddressesProvider, IFlashLoanSimpleReceiver} from "./interfaces/IPool.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {SafeERC20} from "./interfaces/SafeERC20.sol";
import {Ownable} from "./interfaces/Ownable.sol";
import {ReentrancyGuard} from "./interfaces/ReentrancyGuard.sol";
import {Pausable} from "./interfaces/Pausable.sol";

contract GXeonMainnetVault is Ownable, ReentrancyGuard, Pausable, IFlashLoanSimpleReceiver {
    using SafeERC20 for IERC20;

    // ============================================
    // CONSTANTS & CONFIGURATION
    // ============================================
    
    // Profit distribution (basis points: 10000 = 100%)
    uint256 public constant REINVESTMENT_PERCENT = 7000; // 70%
    uint256 public constant COMMANDER_PERCENT = 3000;     // 30%
    uint256 public constant BASIS_POINTS = 10000;
    
    // Minimum profit threshold (in USDC, 6 decimals)
    uint256 public minProfitThreshold = 10 * 1e6; // $10 USDC
    
    // Maximum slippage allowed (0.1% = 10 basis points)
    uint256 public maxSlippageBps = 10;
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // Aave V3
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;
    
    // Tokens
    address public immutable USDC;
    address public immutable WETH;
    address public immutable AAVE;
    
    // Executor contract (authorized to execute flash loans)
    address public flashExecutor;
    
    // Commander revenue tracking
    mapping(address => uint256) public commanderRevenue;
    mapping(address => uint256) public totalClaimed;
    
    // Revenue history
    struct RevenueRecord {
        uint256 timestamp;
        uint256 grossProfit;
        uint256 vaultShare;
        uint256 commanderShare;
        address commander;
        string operationId;
    }
    
    RevenueRecord[] public revenueHistory;
    
    // Global stats
    uint256 public totalVaultRevenue;
    uint256 public totalCommanderRevenue;
    uint256 public totalFlashLoans;
    uint256 public totalVolume;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event FlashLoanExecuted(
        string indexed operationId,
        address indexed asset,
        uint256 amount,
        uint256 premium,
        uint256 grossProfit,
        uint256 vaultShare,
        uint256 commanderShare,
        address indexed commander
    );
    
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
    
    event FundsDeposited(
        address indexed sender,
        uint256 amount,
        address token
    );
    
    event EmergencyWithdraw(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );
    
    event ExecutorUpdated(
        address indexed oldExecutor,
        address indexed newExecutor
    );
    
    event SlippageUpdated(
        uint256 oldSlippage,
        uint256 newSlippage
    );
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyExecutor() {
        require(msg.sender == flashExecutor, "GXeon: Only executor");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _poolAddressesProvider,
        address _usdc,
        address _weth,
        address _aave
    ) Ownable(msg.sender) {
        require(_poolAddressesProvider != address(0), "GXeon: Invalid provider");
        require(_usdc != address(0), "GXeon: Invalid USDC");
        
        ADDRESSES_PROVIDER = IPoolAddressesProvider(_poolAddressesProvider);
        POOL = IPool(ADDRESSES_PROVIDER.getPool());
        
        USDC = _usdc;
        WETH = _weth;
        AAVE = _aave;
        
        // Aprove USDC para Aave
        IERC20(_usdc).safeApprove(address(POOL), type(uint256).max);
    }
    
    // ============================================
    // FLASH LOAN CALLBACK (Aave V3)
    // ============================================
    
    /**
     * @dev Callback executado pelo Aave após flash loan
     * @param asset Token emprestado (USDC)
     * @param amount Quantidade emprestada
     * @param premium Taxa do flash loan (0.05% no Aave)
     * @param initiator Quem iniciou o flash loan
     * @param params Dados codificados da operação
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "GXeon: Invalid caller");
        require(initiator == address(this), "GXeon: Invalid initiator");
        require(asset == USDC, "GXeon: Only USDC supported");
        
        // Decodifica parâmetros
        (
            address commander,
            address dexFrom,
            address dexTo,
            uint256 minAmountOut,
            string memory operationId
        ) = abi.decode(params, (address, address, address, uint256, string));
        
        // Executa arbitragem via executor
        uint256 finalBalance = IERC20(USDC).balanceOf(address(this));
        
        // Chama executor para fazer as trocas
        (bool success, uint256 profit) = executeArbitrage(
            amount,
            dexFrom,
            dexTo,
            minAmountOut
        );
        
        require(success, "GXeon: Arbitrage failed");
        
        // Calcula lucro líquido
        uint256 amountToReturn = amount + premium;
        uint256 grossProfit = profit > amountToReturn ? profit - amountToReturn : 0;
        
        require(grossProfit >= minProfitThreshold, "GXeon: Profit below threshold");
        
        // Distribui lucro 70/30
        distributeProfit(grossProfit, commander, operationId);
        
        // Aprova e retorna para Aave
        uint256 currentBalance = IERC20(USDC).balanceOf(address(this));
        require(currentBalance >= amountToReturn, "GXeon: Insufficient to repay");
        
        IERC20(USDC).safeApprove(address(POOL), amountToReturn);
        
        // Atualiza estatísticas
        totalFlashLoans++;
        totalVolume += amount;
        
        emit FlashLoanExecuted(
            operationId,
            asset,
            amount,
            premium,
            grossProfit,
            (grossProfit * REINVESTMENT_PERCENT) / BASIS_POINTS,
            (grossProfit * COMMANDER_PERCENT) / BASIS_POINTS,
            commander
        );
        
        return true;
    }
    
    // ============================================
    // ARBITRAGE EXECUTION
    // ============================================
    
    /**
     * @dev Executa arbitragem entre duas DEXes
     * Esta função é chamada internamente pelo executeOperation
     */
    function executeArbitrage(
        uint256 amount,
        address dexFrom,
        address dexTo,
        uint256 minAmountOut
    ) internal returns (bool success, uint256 finalAmount) {
        // Transfere USDC para executor
        IERC20(USDC).safeTransfer(flashExecutor, amount);
        
        // Executor faz as trocas e retorna resultado
        (success, finalAmount) = IFlashExecutor(flashExecutor).executeSwaps(
            amount,
            dexFrom,
            dexTo,
            minAmountOut
        );
        
        return (success, finalAmount);
    }
    
    // ============================================
    // PROFIT DISTRIBUTION (70/30 SPLIT)
    // ============================================
    
    /**
     * @dev Distribui lucro entre Vault e Comandante
     * 70% fica no Vault para reinvestimento
     * 30% vai para revenue do comandante
     */
    function distributeProfit(
        uint256 grossProfit,
        address commander,
        string memory operationId
    ) internal {
        uint256 vaultShare = (grossProfit * REINVESTMENT_PERCENT) / BASIS_POINTS;
        uint256 commanderShare = (grossProfit * COMMANDER_PERCENT) / BASIS_POINTS;
        
        // 70% permanece no Vault (já está no contrato)
        totalVaultRevenue += vaultShare;
        
        // 30% acumula para comandante
        commanderRevenue[commander] += commanderShare;
        totalCommanderRevenue += commanderShare;
        
        // Registra histórico
        revenueHistory.push(RevenueRecord({
            timestamp: block.timestamp,
            grossProfit: grossProfit,
            vaultShare: vaultShare,
            commanderShare: commanderShare,
            commander: commander,
            operationId: operationId
        }));
        
        emit ProfitDistributed(
            operationId,
            grossProfit,
            vaultShare,
            commanderShare,
            commander
        );
    }
    
    // ============================================
    // COMMANDER REVENUE CLAIM
    // ============================================
    
    /**
     * @dev Comandante saca seus lucros acumulados em USDC
     * @param amount Quantidade a sacar (0 = sacar tudo)
     * @return amountClaimed Quantidade efetivamente sacada
     */
    function claimCommanderProfits(uint256 amount) 
        external 
        nonReentrant 
        returns (uint256 amountClaimed) 
    {
        uint256 available = commanderRevenue[msg.sender];
        require(available > 0, "GXeon: No revenue to claim");
        
        if (amount == 0 || amount > available) {
            amount = available;
        }
        
        // Atualiza state antes de transferir (checks-effects-interactions)
        commanderRevenue[msg.sender] -= amount;
        totalClaimed[msg.sender] += amount;
        
        // Transfere USDC
        IERC20(USDC).safeTransfer(msg.sender, amount);
        
        emit CommanderRevenueClaimed(msg.sender, amount, block.timestamp);
        
        return amount;
    }
    
    // ============================================
    // EXTERNAL FLASH LOAN INITIATION
    // ============================================
    
    /**
     * @dev Inicia flash loan via Aave V3
     * Apenas executor autorizado pode chamar
     */
    function initiateFlashLoan(
        uint256 amount,
        address dexFrom,
        address dexTo,
        uint256 minAmountOut,
        string calldata operationId
    ) external onlyExecutor whenNotPaused {
        require(amount > 0, "GXeon: Invalid amount");
        require(dexFrom != address(0) && dexTo != address(0), "GXeon: Invalid DEX");
        
        // Prepara parâmetros
        bytes memory params = abi.encode(
            msg.sender, // commander é quem chamou executor
            dexFrom,
            dexTo,
            minAmountOut,
            operationId
        );
        
        // Chama Aave para flash loan
        POOL.flashLoanSimple(
            address(this),
            USDC,
            amount,
            params,
            0 // referralCode
        );
    }
    
    // ============================================
    // VAULT MANAGEMENT
    // ============================================
    
    /**
     * @dev Deposita USDC no Vault para capital de flash loans
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "GXeon: Invalid amount");
        
        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amount);
        
        emit FundsDeposited(msg.sender, amount, USDC);
    }
    
    /**
     * @dev Retorna saldo em USDC disponível no Vault
     */
    function getVaultBalance() external view returns (uint256) {
        return IERC20(USDC).balanceOf(address(this));
    }
    
    /**
     * @dev Owner pode sacar fundos em emergência
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "GXeon: Invalid recipient");
        
        IERC20(token).safeTransfer(recipient, amount);
        
        emit EmergencyWithdraw(token, amount, recipient);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @dev Atualiza endereço do executor
     */
    function setFlashExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "GXeon: Invalid executor");
        
        address oldExecutor = flashExecutor;
        flashExecutor = _executor;
        
        emit ExecutorUpdated(oldExecutor, _executor);
    }
    
    /**
     * @dev Atualiza slippage máximo permitido
     */
    function setMaxSlippage(uint256 _slippageBps) external onlyOwner {
        require(_slippageBps <= 100, "GXeon: Slippage too high"); // Max 1%
        
        uint256 oldSlippage = maxSlippageBps;
        maxSlippageBps = _slippageBps;
        
        emit SlippageUpdated(oldSlippage, _slippageBps);
    }
    
    /**
     * @dev Atualiza threshold mínimo de lucro
     */
    function setMinProfitThreshold(uint256 _threshold) external onlyOwner {
        minProfitThreshold = _threshold;
    }
    
    /**
     * @dev Pausa operações de flash loan
     */
    function pause() public override onlyOwner {
        _pause();
    }
    
    /**
     * @dev Despausa operações
     */
    function unpause() public override onlyOwner {
        _unpause();
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @dev Retorna revenue acumulado do comandante
     */
    function getCommanderRevenue(address commander) 
        external 
        view 
        returns (
            uint256 available,
            uint256 claimed,
            uint256 totalOperations
        ) 
    {
        // Conta operações do comandante
        uint256 operations = 0;
        for (uint256 i = 0; i < revenueHistory.length; i++) {
            if (revenueHistory[i].commander == commander) {
                operations++;
            }
        }
        
        return (commanderRevenue[commander], totalClaimed[commander], operations);
    }
    
    /**
     * @dev Retorna estatísticas globais
     */
    function getGlobalStats() 
        external 
        view 
        returns (
            uint256 vaultRevenue,
            uint256 commanderRevenueTotal,
            uint256 flashLoans,
            uint256 volume,
            uint256 revenueRecords
        ) 
    {
        return (
            totalVaultRevenue,
            totalCommanderRevenue,
            totalFlashLoans,
            totalVolume,
            revenueHistory.length
        );
    }
    
    /**
     * @dev Retorna histórico de revenue com paginação
     */
    function getRevenueHistory(uint256 start, uint256 limit) 
        external 
        view 
        returns (RevenueRecord[] memory) 
    {
        require(start < revenueHistory.length, "GXeon: Invalid start");
        
        uint256 end = start + limit;
        if (end > revenueHistory.length) {
            end = revenueHistory.length;
        }
        
        RevenueRecord[] memory result = new RevenueRecord[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = revenueHistory[i];
        }
        
        return result;
    }
    
    // ============================================
    // RECEIVE FUNCTION
    // ============================================
    
    receive() external payable {
        // Aceita ETH para gas
    }
}

// Interface para o executor
interface IFlashExecutor {
    function executeSwaps(
        uint256 amount,
        address dexFrom,
        address dexTo,
        uint256 minAmountOut
    ) external returns (bool success, uint256 finalAmount);
}
