pragma solidity ^0.8.6;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMOLOCH {
    // brief interface for moloch dao v2

    function depositToken() external view returns (address);

    function tokenWhitelist(address token) external view returns (bool);

    function shamans(address token) external view returns (bool);

    function totalShares() external view returns (uint256);

    function getProposalFlags(uint256 proposalId)
        external
        view
        returns (bool[6] memory);

    function getUserTokenBalance(address user, address token)
        external
        view
        returns (uint256);

    function members(address user)
        external
        view
        returns (
            address,
            uint256,
            uint256,
            bool,
            uint256,
            uint256
        );

    function memberAddressByDelegateKey(address user)
        external
        view
        returns (address);

    function userTokenBalances(address user, address token)
        external
        view
        returns (uint256);

    function cancelProposal(uint256 proposalId) external;

    function submitProposal(
        address applicant,
        uint256 sharesRequested,
        uint256 lootRequested,
        uint256 tributeOffered,
        address tributeToken,
        uint256 paymentRequested,
        address paymentToken,
        string calldata details
    ) external returns (uint256);

    function withdrawBalance(address token, uint256 amount) external;

    function collectTokens(address) external;

    struct Proposal {
        address applicant; // the applicant who wishes to become a member - this key will be used for withdrawals (doubles as guild kick target for gkick proposals)
        address proposer; // the account that submitted the proposal (can be non-member)
        address sponsor; // the member that sponsored the proposal (moving it into the queue)
        uint256 sharesRequested; // the # of shares the applicant is requesting
        uint256 lootRequested; // the amount of loot the applicant is requesting
        uint256 tributeOffered; // amount of tokens offered as tribute
        address tributeToken; // tribute token contract reference
        uint256 paymentRequested; // amount of tokens requested as payment
        address paymentToken; // payment token contract reference
        uint256 startingPeriod; // the period in which voting can start for this proposal
        uint256 yesVotes; // the total number of YES votes for this proposal
        uint256 noVotes; // the total number of NO votes for this proposal
        bool[6] flags; // [sponsored, processed, didPass, cancelled, whitelist, guildkick]
        string details; // proposal details - could be IPFS hash, plaintext, or JSON
        uint256 maxTotalSharesAndLootAtYesVote; // the maximum # of total shares encountered at a yes vote on this proposal
    }

    function proposals(uint256 proposalId)
        external
        view
        returns (
            address,
            address,
            address,
            uint256,
            uint256,
            uint256,
            address,
            uint256,
            address,
            uint256,
            uint256,
            uint256
        );

    function setSharesLoot(
        address[] calldata,
        uint256[] calldata,
        uint256[] calldata,
        bool mint
    ) external;

    function setSingleSharesLoot(
        address,
        uint256,
        uint256,
        bool
    ) external;

    function setShaman(address, bool) external;
}

interface IWRAPPER {
    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
    function deposit() payable external;
}

contract LootAuctionHouse is
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable
{
    event AuctionCreated(
        uint256 indexed nounId,
        uint256 startTime,
        uint256 endTime
    );

    event AuctionBid(
        uint256 indexed nounId,
        address sender,
        uint256 value,
        bool extended
    );

    event AuctionExtended(uint256 indexed nounId, uint256 endTime);

    event AuctionSettled(
        uint256 indexed nounId,
        address winner,
        uint256 amount
    );

    event AuctionTimeBufferUpdated(uint256 timeBuffer);

    event AuctionReservePriceUpdated(uint256 reservePrice);

    event AuctionMinBidIncrementPercentageUpdated(
        uint256 minBidIncrementPercentage
    );

    IMOLOCH public moloch;

    // The address of the wrapper contract
    address public wrapper;

    struct Auction {
        // uid
        uint256 auctionId;
        // member address
        address payable member;
        // amount loot for auction
        uint256 loot;
        // The current highest bid amount
        uint256 amount;
        // The time that the auction started
        uint256 startTime;
        // The time that the auction is scheduled to end
        uint256 endTime;
        // The address of the current highest bid
        address payable bidder;
        // Whether or not the auction has been settled
        bool settled;
        // The minimum amount of time left in an auction after a new bid is created
        uint256 timeBuffer;
        // The minimum price accepted in an auction
        uint256 reservePrice;
        // The minimum percentage difference between the last bid amount and the current bid
        uint8 minBidIncrementPercentage;
        // The duration of a single auction
        uint256 duration;
    }

    // all auctions
    mapping(uint256 => Auction) public auctions;

    // initial id
    uint256 counter = 0;

    /**
     * @notice Initialize the auction house and base contracts,
     * populate configuration values, and pause the contract.
     * @dev This function can only be called once.
     */
    function initialize(address _moloch, address _wrapper) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();
        __Ownable_init();

        _pause();

        moloch = IMOLOCH(_moloch);
        wrapper = _wrapper;
    }


    /**
     * @notice Settle the current auction.
     * @dev This function can only be called when the contract is paused.
     */
    function settleAuction(uint256 _auctionId) external whenPaused nonReentrant {
        _settleAuction(_auctionId);
    }

    /**
     * @notice Create a bid for a Noun, with a given amount.
     * @dev This contract only accepts payment in ETH.
     */
    function createBid(uint256 _auctionId)
        external
        payable
        nonReentrant
    {
        Auction memory auction = auctions[_auctionId];

        require(auction.auctionId == _auctionId, "not a valid auction");
        require(block.timestamp < auction.endTime, "Auction expired");
        require(
            msg.value >= auction.reservePrice,
            "Must send at least reservePrice"
        );
        require(
            msg.value >=
                auction.amount +
                    ((auction.amount * auction.minBidIncrementPercentage) /
                        100),
            "Must send more than last bid by minBidIncrementPercentage amount"
        );
        // todo: should not bid on own loot?

        address payable lastBidder = auction.bidder;

        // Refund the last bidder, if applicable
        if (lastBidder != address(0)) {
            _safeTransferETHWithFallback(lastBidder, auction.amount);
        }

        auction.amount = msg.value;
        auction.bidder = payable(msg.sender);

        // Extend the auction if the bid was received within `timeBuffer` of the auction end time
        bool extended = auction.endTime - block.timestamp < auction.timeBuffer;
        if (extended) {
            auction.endTime = auction.endTime =
                block.timestamp +
                auction.timeBuffer;
        }

        emit AuctionBid(_auctionId, msg.sender, msg.value, extended);

        if (extended) {
            emit AuctionExtended(_auctionId, auction.endTime);
        }
    }

    /**
     * @notice Pause the Loot auction house.
     * @dev This function can only be called by the owner when the
     * contract is unpaused. While no new auctions can be started when paused,
     * anyone can settle an ongoing auction.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the Loot auction house.
     * @dev This function can only be called by the owner when the
     * contract is paused. If required, this function will start a new auction.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Set the auction time buffer.
     * @dev Only callable by the owner.
     */
    function setTimeBuffer(uint256 _auctionId, uint256 _timeBuffer)
        external
        onlyOwner
    {
        Auction memory auction = auctions[_auctionId];

        auction.timeBuffer = _timeBuffer;

        emit AuctionTimeBufferUpdated(_timeBuffer);
    }

    /**
     * @notice Set the auction reserve price.
     * @dev Only callable by the owner.
     */
    function setReservePrice(uint256 _auctionId, uint256 _reservePrice)
        external
        onlyOwner
    {
        Auction memory auction = auctions[_auctionId];

        auction.reservePrice = _reservePrice;

        emit AuctionReservePriceUpdated(_reservePrice);
    }

    /**
     * @notice Set the auction minimum bid increment percentage.
     * @dev Only callable by the owner.
     */
    function setMinBidIncrementPercentage(
        uint256 _auctionId,
        uint8 _minBidIncrementPercentage
    ) external onlyOwner {
        Auction memory auction = auctions[_auctionId];

        auction.minBidIncrementPercentage = _minBidIncrementPercentage;

        emit AuctionMinBidIncrementPercentageUpdated(
            _minBidIncrementPercentage
        );
    }

    /**
     * @notice Create an auction.
     * @dev Store the auction details in the `auction` state variable and emit an AuctionCreated event.
     * If the mint reverts, the minter was updated without pausing this contract first. To remedy this,
     * catch the revert and pause this contract.
     */
    function _createAuction(
        uint256 _timeBuffer,
        uint256 _reservePrice,
        uint8 _minBidIncrementPercentage,
        uint256 _duration,
        uint256 _loot
    ) internal {
        counter = counter + 1;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + _duration;

        // check member has loot

        // hold loot in dao hole
        moloch.setSingleSharesLoot(
            msg.sender,
            0,
            _loot,
            false
        );
        moloch.setSingleSharesLoot(
            address(0xdead),
            0,
            _loot,
            true
        );

        auctions[counter] = Auction({
            auctionId: counter,
            member: payable(msg.sender),
            loot: _loot,
            amount: 0,
            startTime: startTime,
            endTime: endTime,
            bidder: payable(0),
            settled: false,
            timeBuffer: _timeBuffer,
            reservePrice: _reservePrice,
            minBidIncrementPercentage: _minBidIncrementPercentage,
            duration: _duration
        });

        emit AuctionCreated(counter, startTime, endTime);
    }

    /**
     * @notice Settle an auction, finalizing the bid and paying out to the owner.
     * @dev If there are no bids, the Noun is burned.
     */
    function _settleAuction(uint256 auctionId) internal {
        Auction memory auction = auctions[auctionId];

        require(auction.startTime != 0, "Auction hasn't begun");
        require(!auction.settled, "Auction has already been settled");
        require(
            block.timestamp >= auction.endTime,
            "Auction hasn't completed"
        );

        auction.settled = true;

        if (auction.bidder == address(0)) {
            // move loot back to auction.member
            moloch.setSingleSharesLoot(
                auction.member,
                0,
                auction.loot,
                true
            );
        } else {
            // move loot to winner
            moloch.setSingleSharesLoot(
                auction.bidder,
                0,
                auction.loot,
                true
            );
        }
        moloch.setSingleSharesLoot(
            address(0xdead),
            0,
            auction.loot,
            false
        );

        if (auction.amount > 0) {
            _safeTransferETHWithFallback(owner(), auction.amount);
        }

        emit AuctionSettled(auctionId, auction.bidder, auction.amount);
    }

    /**
     * @notice Transfer ETH. If the ETH transfer fails, wrap the ETH and try send it as WETH.
     */
    function _safeTransferETHWithFallback(address to, uint256 amount) internal {
        if (!_safeTransferETH(to, amount)) {
            IWRAPPER(wrapper).deposit{value: amount}();
            IERC20(wrapper).transfer(to, amount);
        }
    }

    /**
     * @notice Transfer ETH and return the success status.
     * @dev This function only forwards 30,000 gas to the callee.
     */
    function _safeTransferETH(address to, uint256 value)
        internal
        returns (bool)
    {
        (bool success, ) = to.call{value: value, gas: 30_000}(new bytes(0));
        return success;
    }
}
