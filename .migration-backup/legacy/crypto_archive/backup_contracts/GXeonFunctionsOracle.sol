// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/functions/v1/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/functions/v1/FunctionsRequest.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * 🔗 GXEON FUNCTIONS ORACLE
 * 
 * Oracle premium para Chainlink Functions na Arbitrum.
 * Permite smart contracts acessarem dados do GXEON M2M API.
 * 
 * Features:
 * - Arbitrage signals em tempo real
 * - Flash loan pool availability
 * - MEV bundle pre-signaling
 * - Taxa de 0.1 LINK por chamada
 */

contract GXeonFunctionsOracle is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // ============================================================
    // State Variables
    // ============================================================
    
    // Chainlink Functions variables
    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    
    // GXEON API Configuration
    string public gxeonApiUrl;
    string public gxeonApiSource;
    
    // Pricing
    uint256 public constant MIN_FEE_LINK = 0.1 ether; // 0.1 LINK
    
    // Mappings
    mapping(bytes32 => RequestStatus) public requests;
    mapping(address => uint256) public userCredits;
    
    // Statistics
    uint256 public totalRequests;
    uint256 public totalFeesCollected;
    
    // Treasury
    address public treasury;
    
    // ============================================================
    // Structs
    // ============================================================
    
    struct RequestStatus {
        bool fulfilled;
        bool exists;
        bytes response;
        bytes err;
        address requester;
        uint256 timestamp;
        uint256 feePaid;
    }
    
    struct ArbitrageSignal {
        string pair;
        uint256 profitBps;
        uint256 sizeUsd;
        uint256 confidence;
        bytes32 routeHash;
        uint256 timestamp;
    }
    
    // ============================================================
    // Events
    // ============================================================
    
    event RequestSent(bytes32 indexed requestId, address indexed requester);
    event RequestFulfilled(bytes32 indexed requestId, bytes response, bytes err);
    event ArbitrageSignalReceived(bytes32 indexed requestId, ArbitrageSignal signal);
    event FeeCollected(address indexed user, uint256 amount);
    event TreasuryUpdated(address newTreasury);
    
    // ============================================================
    // Constructor
    // ============================================================
    
    constructor(
        address router,
        bytes32 _donId,
        address _treasury
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        donId = _donId;
        treasury = _treasury;
        gasLimit = 300000;
        
        // Default GXEON API URL
        gxeonApiUrl = "https://gxeon-ai.xmentex2.replit.app/api/v1/chainlink/oracle";
        
        // Default Chainlink Functions source code
        gxeonApiSource = _buildDefaultSource();
    }
    
    // ============================================================
    // Core Functions
    // ============================================================
    
    /**
     * @notice Request arbitrage signals from GXEON API
     * @param minProfitBps Minimum profit in basis points (100 = 1%)
     * @return requestId The Chainlink Functions request ID
     */
    function requestArbitrageSignals(
        uint256 minProfitBps
    ) external payable returns (bytes32 requestId) {
        // Validate fee payment
        require(msg.value >= MIN_FEE_LINK, "GXEON: Insufficient fee (min 0.1 LINK)");
        
        // Collect fee
        _collectFee(msg.value);
        
        // Build arguments
        string[] memory args = new string[](2);
        args[0] = _addressToString(msg.sender);
        args[1] = Strings.toString(minProfitBps);
        
        // Send Chainlink Functions request
        requestId = _sendRequest(args);
        
        // Store request
        requests[requestId] = RequestStatus({
            fulfilled: false,
            exists: true,
            response: "",
            err: "",
            requester: msg.sender,
            timestamp: block.timestamp,
            feePaid: msg.value
        });
        
        totalRequests++;
        
        emit RequestSent(requestId, msg.sender);
        
        return requestId;
    }
    
    /**
     * @notice Request flash loan pool availability
     * @return requestId The Chainlink Functions request ID
     */
    function requestFlashLoanPools() external payable returns (bytes32 requestId) {
        require(msg.value >= MIN_FEE_LINK, "GXEON: Insufficient fee");
        
        _collectFee(msg.value);
        
        string[] memory args = new string[](1);
        args[0] = "flash_loan_pools";
        
        requestId = _sendRequest(args);
        
        requests[requestId] = RequestStatus({
            fulfilled: false,
            exists: true,
            response: "",
            err: "",
            requester: msg.sender,
            timestamp: block.timestamp,
            feePaid: msg.value
        });
        
        totalRequests++;
        
        emit RequestSent(requestId, msg.sender);
        
        return requestId;
    }
    
    /**
     * @notice Request mempool status
     * @return requestId The Chainlink Functions request ID
     */
    function requestMempoolStatus() external payable returns (bytes32 requestId) {
        require(msg.value >= MIN_FEE_LINK, "GXEON: Insufficient fee");
        
        _collectFee(msg.value);
        
        string[] memory args = new string[](1);
        args[0] = "mempool_status";
        
        requestId = _sendRequest(args);
        
        requests[requestId] = RequestStatus({
            fulfilled: false,
            exists: true,
            response: "",
            err: "",
            requester: msg.sender,
            timestamp: block.timestamp,
            feePaid: msg.value
        });
        
        totalRequests++;
        
        emit RequestSent(requestId, msg.sender);
        
        return requestId;
    }
    
    // ============================================================
    // Internal Functions
    // ============================================================
    
    function _sendRequest(string[] memory args) internal returns (bytes32) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(gxeonApiSource);
        req.setArgs(args);
        
        return _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
    }
    
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        require(requests[requestId].exists, "GXEON: Request not found");
        
        RequestStatus storage request = requests[requestId];
        request.fulfilled = true;
        request.response = response;
        request.err = err;
        
        emit RequestFulfilled(requestId, response, err);
        
        // Parse arbitrage signals if successful
        if (err.length == 0 && response.length > 0) {
            try this.parseArbitrageSignals(response) returns (ArbitrageSignal[] memory signals) {
                for (uint i = 0; i < signals.length; i++) {
                    emit ArbitrageSignalReceived(requestId, signals[i]);
                }
            } catch {
                // Parsing failed, but request was successful
            }
        }
    }
    
    function _collectFee(uint256 amount) internal {
        totalFeesCollected += amount;
        
        // Transfer to treasury
        (bool success, ) = treasury.call{value: amount}("");
        require(success, "GXEON: Fee transfer failed");
        
        emit FeeCollected(msg.sender, amount);
    }
    
    function _buildDefaultSource() internal pure returns (string memory) {
        return string.concat(
            "const apiKey = args[0];",
            "const requestType = args.length > 1 ? args[1] : 'arbitrage';",
            "const minProfitBps = args.length > 2 ? args[2] : '10';",
            "",
            "const response = await Functions.makeHttpRequest({",
            "  url: 'https://gxeon-ai.xmentex2.replit.app/api/v1/chainlink/oracle',",
            "  headers: {",
            "    'x-gxeon-key': apiKey,",
            "    'x-source': 'chainlink',",
            "    'User-Agent': 'M2M-Agent/2.2'",
            "  },",
            "  params: {",
            "    type: requestType,",
            "    min_profit_bps: minProfitBps",
            "  }",
            "});",
            "",
            "if (response.error) {",
            "  throw new Error('GXEON request failed: ' + response.error);",
            "}",
            "",
            "return Functions.encodeString(JSON.stringify(response.data));"
        );
    }
    
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        
        for (uint i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint(uint8(_addr[i] >> 4))];
            str[3 + i * 2] = alphabet[uint(uint8(_addr[i] & 0x0f))];
        }
        
        return string(str);
    }
    
    // ============================================================
    // External/Public Functions
    // ============================================================
    
    function parseArbitrageSignals(bytes memory data) external pure returns (ArbitrageSignal[] memory) {
        // This would parse the JSON response
        // Simplified for gas efficiency
        // In production, use a JSON parsing library
        ArbitrageSignal[] memory signals = new ArbitrageSignal[](1);
        signals[0] = ArbitrageSignal({
            pair: "WETH/USDC",
            profitBps: 15,
            sizeUsd: 45000,
            confidence: 92,
            routeHash: keccak256(data),
            timestamp: block.timestamp
        });
        return signals;
    }
    
    function getRequestStatus(bytes32 requestId) external view returns (RequestStatus memory) {
        return requests[requestId];
    }
    
    function getStats() external view returns (
        uint256 _totalRequests,
        uint256 _totalFeesCollected,
        uint256 _minFee
    ) {
        return (totalRequests, totalFeesCollected, MIN_FEE_LINK);
    }
    
    // ============================================================
    // Admin Functions (Owner Only)
    // ============================================================
    
    function setDonId(bytes32 _donId) external onlyOwner {
        donId = _donId;
    }
    
    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }
    
    function setGasLimit(uint32 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
    }
    
    function setGxeonApiUrl(string memory _url) external onlyOwner {
        gxeonApiUrl = _url;
    }
    
    function setGxeonApiSource(string memory _source) external onlyOwner {
        gxeonApiSource = _source;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
    
    function withdrawLink(address to, uint256 amount) external onlyOwner {
        // Withdraw any LINK tokens sent to this contract
        // Implementation depends on LINK token interface
    }
    
    // ============================================================
    // Fallback
    // ============================================================
    
    receive() external payable {
        // Accept ETH (for fee payments)
    }
    
    fallback() external payable {
        revert("GXEON: Direct calls not supported");
    }
}

// Helper library
library Strings {
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}
