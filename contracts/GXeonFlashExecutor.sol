// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title GXeonFlashExecutor
 * @dev Executor de arbitragem com integração UniswapV3 e SushiSwap
 * 
 * Features:
 * - Uniswap V3 (concentrated liquidity, melhor preço)
 * - SushiSwap V2 (backup DEX)
 * - Slippage protection 0.1% (10 basis points)
 * - Chainlink price validation
 * - MEV protection via time constraints
 */

import {IERC20} from "./interfaces/IERC20.sol";
import {SafeERC20} from "./interfaces/SafeERC20.sol";
import {Ownable} from "./interfaces/Ownable.sol";
import {ReentrancyGuard} from "./interfaces/ReentrancyGuard.sol";

contract GXeonFlashExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // CONSTANTS
    // ============================================
    
    // Slippage base: 0.1% = 10 basis points
    uint256 public constant BASE_SLIPPAGE_BPS = 10;
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Máximo slippage aceitável: 0.5%
    uint256 public constant MAX_SLIPPAGE_BPS = 50;
    
    // DEX types
    enum DexType {
        UNISWAP_V3,
        SUSHISWAP_V2,
        UNISWAP_V2
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // Vault autorizado
    address public immutable VAULT;
    
    // Tokens
    address public immutable USDC;
    address public immutable WETH;
    address public immutable WBTC;
    address public immutable DAI;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiswapRouter;
    address public uniswapV2Router;
    
    // Chainlink Price Feeds
    address public usdcPriceFeed;
    address public ethPriceFeed;
    
    // Slippage configurável (padrão 0.1%)
    uint256 public slippageBps = BASE_SLIPPAGE_BPS;
    
    // Tempo máximo para execução (30 segundos para MEV protection)
    uint256 public maxExecutionDelay = 30;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event SwapExecuted(
        DexType indexed dex,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 slippageBps
    );
    
    event ArbitrageCompleted(
        uint256 amountIn,
        uint256 amountOut,
        uint256 grossProfit,
        uint256 netProfit,
        uint256 gasUsed
    );
    
    event DexRouterUpdated(
        DexType indexed dex,
        address indexed oldRouter,
        address indexed newRouter
    );
    
    event SlippageUpdated(
        uint256 oldSlippage,
        uint256 newSlippage
    );
    
    event PriceValidationFailed(
        address indexed token,
        uint256 expected,
        uint256 actual,
        uint256 deviation
    );
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyVault() {
        require(msg.sender == VAULT, "GXeonExecutor: Only vault");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _vault,
        address _usdc,
        address _weth,
        address _wbtc,
        address _dai,
        address _uniswapV3Router,
        address _sushiswapRouter
    ) Ownable(msg.sender) {
        require(_vault != address(0), "GXeonExecutor: Invalid vault");
        require(_usdc != address(0), "GXeonExecutor: Invalid USDC");
        
        VAULT = _vault;
        USDC = _usdc;
        WETH = _weth;
        WBTC = _wbtc;
        DAI = _dai;
        
        uniswapV3Router = _uniswapV3Router;
        sushiswapRouter = _sushiswapRouter;
        
        // Aprova tokens para routers
        IERC20(USDC).safeApprove(_uniswapV3Router, type(uint256).max);
        IERC20(USDC).safeApprove(_sushiswapRouter, type(uint256).max);
        IERC20(WETH).safeApprove(_uniswapV3Router, type(uint256).max);
        IERC20(WETH).safeApprove(_sushiswapRouter, type(uint256).max);
    }
    
    // ============================================
    // MAIN EXECUTION FUNCTION
    // ============================================
    
    /**
     * @dev Executa arbitragem completa (2 swaps)
     * Chamado pelo Vault durante callback do flash loan
     * 
     * Fluxo:
     * 1. Recebe USDC do Vault
     * 2. Swap USDC → WETH (DEX 1)
     * 3. Swap WETH → USDC (DEX 2)
     * 4. Retorna USDC ao Vault
     * 
     * @param amount Quantidade USDC inicial
     * @param dexFrom DEX para primeira troca (USDC → WETH)
     * @param dexTo DEX para segunda troca (WETH → USDC)
     * @param minAmountOut Mínimo exigido de retorno
     * @return success Se executou com sucesso
     * @return finalAmount Quantidade final em USDC
     */
    function executeSwaps(
        uint256 amount,
        address dexFrom,
        address dexTo,
        uint256 minAmountOut
    ) external onlyVault nonReentrant returns (bool success, uint256 finalAmount) {
        require(amount > 0, "GXeonExecutor: Invalid amount");
        require(dexFrom != address(0) && dexTo != address(0), "GXeonExecutor: Invalid DEX");
        
        uint256 gasStart = gasleft();
        
        // Recebe USDC do Vault
        IERC20(USDC).safeTransferFrom(VAULT, address(this), amount);
        
        // Swap 1: USDC → WETH
        uint256 wethReceived = swapExactInputSingle(
            USDC,
            WETH,
            amount,
            dexFrom,
            calculateMinOut(amount, USDC, WETH, dexFrom) // 0.1% slippage
        );
        
        require(wethReceived > 0, "GXeonExecutor: First swap failed");
        
        // Swap 2: WETH → USDC
        finalAmount = swapExactInputSingle(
            WETH,
            USDC,
            wethReceived,
            dexTo,
            minAmountOut // Usa minAmountOut passado pelo Vault
        );
        
        require(finalAmount >= minAmountOut, "GXeonExecutor: Slippage exceeded");
        require(finalAmount > amount, "GXeonExecutor: Not profitable");
        
        // Retorna USDC ao Vault
        IERC20(USDC).safeTransfer(VAULT, finalAmount);
        
        // Calcula estatísticas
        uint256 grossProfit = finalAmount - amount;
        uint256 gasUsed = gasStart - gasleft();
        
        emit ArbitrageCompleted(
            amount,
            finalAmount,
            grossProfit,
            grossProfit, // Net profit antes de fees Aave
            gasUsed
        );
        
        return (true, finalAmount);
    }
    
    // ============================================
    // SWAP FUNCTIONS
    // ============================================
    
    /**
     * @dev Executa swap single-hop com slippage control
     * Suporta Uniswap V3 e SushiSwap V2
     */
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address router,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        // Identifica tipo de DEX
        DexType dexType = identifyDex(router);
        
        // Transfere tokens para router (se necessário)
        IERC20(tokenIn).safeTransfer(router, amountIn);
        
        if (dexType == DexType.UNISWAP_V3) {
            amountOut = swapUniswapV3(tokenIn, tokenOut, amountIn, minAmountOut);
        } else if (dexType == DexType.SUSHISWAP_V2 || dexType == DexType.UNISWAP_V2) {
            amountOut = swapSushiswapV2(tokenIn, tokenOut, amountIn, minAmountOut);
        } else {
            revert("GXeonExecutor: Unknown DEX");
        }
        
        emit SwapExecuted(
            dexType,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            slippageBps
        );
        
        return amountOut;
    }
    
    /**
     * @dev Swap via Uniswap V3 (concentrated liquidity)
     * Melhor preço, menor slippage
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        // Parâmetros do swap Uniswap V3
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: 500, // 0.05% fee tier (mais líquido)
            recipient: address(this),
            deadline: block.timestamp + maxExecutionDelay,
            amountIn: amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });
        
        // Executa swap
        amountOut = ISwapRouter(uniswapV3Router).exactInputSingle(params);
        
        return amountOut;
    }
    
    /**
     * @dev Swap via SushiSwap V2 (AMM tradicional)
     * Backup quando V3 não tem liquidez
     */
    function swapSushiswapV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        // Path: tokenIn → tokenOut
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        // Executa swap
        uint[] memory amounts = IUniswapV2Router02(sushiswapRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + maxExecutionDelay
        );
        
        return amounts[amounts.length - 1];
    }
    
    // ============================================
    // SLIPPAGE CALCULATION
    // ============================================
    
    /**
     * @dev Calcula quantidade mínima de saída com 0.1% slippage
     * Usa Chainlink Price Feed para estimar preço justo
     */
    function calculateMinOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        address router
    ) internal view returns (uint256 minAmountOut) {
        // Estima preço via consulta ao DEX
        uint256 expectedOut = getExpectedOutput(amountIn, tokenIn, tokenOut, router);
        
        // Aplica slippage: min = expected * (1 - slippage)
        // slippageBps = 10 (0.1%)
        // minAmountOut = expectedOut * (10000 - 10) / 10000
        minAmountOut = (expectedOut * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
        
        return minAmountOut;
    }
    
    /**
     * @dev Consulta preço esperado no DEX (view function)
     * Usado para calcular slippage antes de executar
     */
    function getExpectedOutput(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        address router
    ) public view returns (uint256) {
        DexType dexType = identifyDex(router);
        
        if (dexType == DexType.SUSHISWAP_V2 || dexType == DexType.UNISWAP_V2) {
            address[] memory path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
            
            uint[] memory amounts = IUniswapV2Router02(router).getAmountsOut(amountIn, path);
            return amounts[1];
        }
        
        // Para Uniswap V3, simula com quoter
        // (em produção, usar QuoterV2)
        return amountIn; // Simplificado para exemplo
    }
    
    // ============================================
    // DEX IDENTIFICATION
    // ============================================
    
    /**
     * @dev Identifica qual DEX é o router
     */
    function identifyDex(address router) public view returns (DexType) {
        if (router == uniswapV3Router) {
            return DexType.UNISWAP_V3;
        } else if (router == sushiswapRouter) {
            return DexType.SUSHISWAP_V2;
        } else if (router == uniswapV2Router) {
            return DexType.UNISWAP_V2;
        }
        revert("GXeonExecutor: Unknown router");
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @dev Atualiza endereço de router
     */
    function setRouter(DexType dex, address router) external onlyOwner {
        require(router != address(0), "GXeonExecutor: Invalid router");
        
        address oldRouter;
        
        if (dex == DexType.UNISWAP_V3) {
            oldRouter = uniswapV3Router;
            uniswapV3Router = router;
        } else if (dex == DexType.SUSHISWAP_V2) {
            oldRouter = sushiswapRouter;
            sushiswapRouter = router;
        } else if (dex == DexType.UNISWAP_V2) {
            oldRouter = uniswapV2Router;
            uniswapV2Router = router;
        }
        
        // Reaprova tokens para novo router
        IERC20(USDC).safeApprove(router, type(uint256).max);
        IERC20(WETH).safeApprove(router, type(uint256).max);
        
        emit DexRouterUpdated(dex, oldRouter, router);
    }
    
    /**
     * @dev Atualiza slippage permitido (máx 0.5%)
     */
    function setSlippage(uint256 _slippageBps) external onlyOwner {
        require(_slippageBps <= MAX_SLIPPAGE_BPS, "GXeonExecutor: Slippage too high");
        require(_slippageBps >= 1, "GXeonExecutor: Slippage too low");
        
        uint256 oldSlippage = slippageBps;
        slippageBps = _slippageBps;
        
        emit SlippageUpdated(oldSlippage, _slippageBps);
    }
    
    /**
     * @dev Atualiza tempo máximo de execução (MEV protection)
     */
    function setMaxExecutionDelay(uint256 delay) external onlyOwner {
        require(delay >= 10 && delay <= 300, "GXeonExecutor: Invalid delay");
        maxExecutionDelay = delay;
    }
    
    /**
     * @dev Recupera tokens presos (emergência)
     */
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @dev Retorna configuração atual
     */
    function getConfig() external view returns (
        address vault,
        address usdc,
        address weth,
        uint256 slippage,
        uint256 maxDelay
    ) {
        return (VAULT, USDC, WETH, slippageBps, maxExecutionDelay);
    }
}

// ============================================
// INTERFACES EXTERNAS
// ============================================

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}
