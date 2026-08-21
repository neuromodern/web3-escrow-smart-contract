// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EasyEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Custom Errors (Saves gas compared to require strings) ---
    error InvalidAmount();
    error InvalidAddress();
    error IncorrectMsgValue();
    error Unauthorized();
    error InvalidState();
    error TimeoutNotReached();

    enum TradeStatus { AwaitingSeller, AwaitingArbiter, Completed, Refunded }

    struct Trade {
        address buyer;
        address seller;
        address arbiter;
        address token; // address(0) represents native ETH
        uint256 amount; // Base amount for the seller
        uint256 arbiterFee; // Arbiter's reward (added on top of the base amount)
        uint256 sellerTimeout; // Unix Timestamp for seller's delivery deadline
        uint256 arbiterTimeout; // Unix Timestamp for arbiter's resolution deadline
        TradeStatus status;
    }

    // --- Hardcoded Global Constants ---
    // The platform's treasury address where fees are collected
    address public constant platformTreasury = 0x0Aeda0471B2B7B296570D307fc0175CA89BeE124;
    
    // Platform fee: 50 basis points = 0.5%
    uint256 public constant platformFeeBasisPoints = 50; 
    
    // --- State Variables ---
    uint256 public tradeCounter;
    mapping(uint256 => Trade) public trades;

    // --- Events ---
    event TradeCreated(uint256 indexed tradeId, address indexed buyer, address indexed seller, address token);
    event SellerDelivered(uint256 indexed tradeId);
    event TradeResolved(uint256 indexed tradeId, bool inFavorOfBuyer);
    event Refunded(uint256 indexed tradeId, string reason);

    /**
     * @dev Creates a new escrow trade. 
     * The platform fee is calculated from the base amount (0.5%) and sent upfront.
     */
    function createTrade(
        address _seller,
        address _arbiter,
        address _token,
        uint256 _amount,
        uint256 _arbiterFee,
        uint256 _sellerTimeoutSeconds,
        uint256 _arbiterTimeoutSeconds,
        bool _autoApproveSeller
    ) external payable nonReentrant {
        if (_seller == address(0) || _arbiter == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidAmount();

        // Calculate the platform fee (rounded down)
        uint256 platformFee = (_amount * platformFeeBasisPoints) / 10000;
        
        // Total locked inside the contract for the trade
        uint256 totalLocked = _amount + _arbiterFee;
        
        // Total amount required from the buyer (Locked + Platform Fee)
        uint256 totalRequired = totalLocked + platformFee;

        // Handle transfers based on token type (Native ETH or ERC-20)
        if (_token == address(0)) {
            // Native Token (ETH, MATIC, BNB, etc.)
            if (msg.value != totalRequired) revert IncorrectMsgValue();
            
            // Send the platform fee to the treasury immediately
            if (platformFee > 0) {
                (bool success, ) = platformTreasury.call{value: platformFee}("");
                require(success, "Fee transfer failed");
            }
        } else {
            // ERC-20 Tokens (USDC, USDT, WBTC, etc.)
            if (msg.value != 0) revert IncorrectMsgValue();
            
            // Transfer the total required amount from the buyer to this contract
            IERC20(_token).safeTransferFrom(msg.sender, address(this), totalRequired);
            
            // Send the platform fee to the treasury immediately
            if (platformFee > 0) {
                IERC20(_token).safeTransfer(platformTreasury, platformFee);
            }
        }

        // Increment the trade counter and generate a new ID
        tradeCounter++;
        uint256 newTradeId = tradeCounter;

        // Save the trade details in storage
        trades[newTradeId] = Trade({
            buyer: msg.sender,
            seller: _seller,
            arbiter: _arbiter,
            token: _token,
            amount: _amount,
            arbiterFee: _arbiterFee,
            sellerTimeout: block.timestamp + _sellerTimeoutSeconds,
            arbiterTimeout: block.timestamp + _arbiterTimeoutSeconds,
            status: _autoApproveSeller ? TradeStatus.AwaitingArbiter : TradeStatus.AwaitingSeller
        });

        emit TradeCreated(newTradeId, msg.sender, _seller, _token);
    }

    /**
     * @dev Called by the seller to confirm the work has been delivered.
     */
    function sellerDeliver(uint256 _tradeId) external {
        Trade storage trade = trades[_tradeId];
        
        if (msg.sender != trade.seller) revert Unauthorized();
        if (trade.status != TradeStatus.AwaitingSeller) revert InvalidState();

        trade.status = TradeStatus.AwaitingArbiter;
        emit SellerDelivered(_tradeId);
    }

    /**
     * @dev Called by the arbiter to resolve the trade or dispute.
     */
    function resolveTrade(uint256 _tradeId, bool _inFavorOfBuyer) external nonReentrant {
        Trade storage trade = trades[_tradeId];
        
        if (msg.sender != trade.arbiter) revert Unauthorized();
        if (trade.status != TradeStatus.AwaitingArbiter) revert InvalidState();

        trade.status = _inFavorOfBuyer ? TradeStatus.Refunded : TradeStatus.Completed;

        // Payout the arbiter's fee
        if (trade.arbiterFee > 0) {
            _transferFunds(trade.token, trade.arbiter, trade.arbiterFee);
        }

        // Payout the base amount based on the decision
        if (_inFavorOfBuyer) {
            _transferFunds(trade.token, trade.buyer, trade.amount);
        } else {
            _transferFunds(trade.token, trade.seller, trade.amount);
        }

        emit TradeResolved(_tradeId, _inFavorOfBuyer);
    }

    /**
     * @dev Fallback mechanism: refunds the buyer if the seller fails to deliver before the timeout.
     */
    function sellerTimeoutRefund(uint256 _tradeId) external nonReentrant {
        Trade storage trade = trades[_tradeId];
        
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (trade.status != TradeStatus.AwaitingSeller) revert InvalidState();
        if (block.timestamp <= trade.sellerTimeout) revert TimeoutNotReached();

        trade.status = TradeStatus.Refunded;
        
        // Refund both the base amount and the arbiter's fee to the buyer
        uint256 refundAmount = trade.amount + trade.arbiterFee;
        _transferFunds(trade.token, trade.buyer, refundAmount);

        emit Refunded(_tradeId, "Seller Timeout");
    }

    /**
     * @dev Fallback mechanism: refunds the buyer if the arbiter disappears and fails to resolve the trade in time.
     */
    function emergencyRefundBuyer(uint256 _tradeId) external nonReentrant {
        Trade storage trade = trades[_tradeId];
        
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (trade.status != TradeStatus.AwaitingArbiter) revert InvalidState();
        if (block.timestamp <= trade.arbiterTimeout) revert TimeoutNotReached();

        trade.status = TradeStatus.Refunded;
        
        // Refund both the base amount and the arbiter's fee to the buyer
        uint256 refundAmount = trade.amount + trade.arbiterFee;
        _transferFunds(trade.token, trade.buyer, refundAmount);

        emit Refunded(_tradeId, "Arbiter Timeout");
    }

    // --- Internal Helpers ---

    /**
     * @dev Internal function to handle both native ETH and ERC-20 transfers.
     */
    function _transferFunds(address _token, address _to, uint256 _amount) internal {
        if (_amount == 0) return;
        
        if (_token == address(0)) {
            (bool success, ) = _to.call{value: _amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }
}