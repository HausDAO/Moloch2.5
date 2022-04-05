// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "hardhat/console.sol";

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

interface IERC20 {
    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

/*
There are 576 NFTs (plots) a 24x24 grid. 
All land is always for sale. 
Each plot has a few different actions that can happen.
- discover: (new plot)
- deposit: (stake funds in some land for future tax collection )
- unstake: remove the deposit
- set price: change the price for buy out. Price will determine how much 'tax' is collect
- collect: anyone can act as a tax collector on land. it will collect all taxes from the last collection period and if there is not enough funds deposited the land goes into foreclosure. Foreclosure price of land to 0. taxes and fees are deposited into the dao as shares. the tax collector gets loot.
- buy land: anyone can buy land based on the set price. funds are transferred to the seller, land is transferred to the owner. 
- grace: land is put into a grace period state for some number of periods when foreclosed. during cooldown owner can deposit more stake to get it out of foreclosure.
- there is also a discovery fee (loot goes to contract owner) and deposit fee (loot goes to public goods fund)

All land starts as undiscovered can be discovered by minting. At discovery only a discover fee is paid to contract owner. initially price is set to 0 the next collection event would set plot foreclosed if no stake is made. period length can be set as some number of seconds.

Anyone can collect fees and taxes from land. all funds are sent to the dao. collector gets loot for performing the function as total collectionRate (collectionRate is deducted from shares given to owner). owner gets shares for any taxes and fees paid (minus collection fee). public goods gets a set rate of loot which dilutes the dao. collection is removed from owners current stake. If the owner does not have enough stake to pay fees/taxes all remaining stake is used and land is set insolvent(foreclosed) at that time. last collection period is set on the plot

a owner can deposit enough to cover some future amount of periods for fees and taxes. if price is set they will need to cover current taxes as well. 
*/

contract HarbergerNft is ERC721, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    IMOLOCH public moloch;
    IERC20 public token;

    uint256 public discoveryFee = 10000000000000000; // fee to discover new
    uint256 public collectionRate = 3; // fee for colector
    uint256 public depositFee = 10000000000000000; // fee to deposit
    uint256 public basePrice = 10000000000000000; // fee to deposit
    uint256 public publicGoodRate = 3; // public goods fund, dillutes dao
    uint256 public taxRate = 3; // global tax rate
    uint256 unitPer = 100;

    uint256 public periodLength; // length of a deposit period
    uint256 public gracePeriod; // cool down before fair game
    uint256 summoningTime; // time the game is launched
    uint256 rows = 24; // 30 x 30 grid
    uint256 cols = 24; // 30 x 30 grid
    uint256 cap = rows * cols; // 30 x 30 grid

    // TODO
    // dao (owner) can change fees and rates
    // price of nft can only be set in intervals then loot per is easier
    //

    event DiscoverFee(uint256 plotId, uint256 amount, address _paidTo);
    event AddStake(uint256 plotId, uint256 amount);
    event Unstake(uint256 plotId, uint256 amount);
    event SetPrice(uint256 plotId, uint256 price);
    event SetMeta(uint256 plotId, uint24 color);
    event Collection(
        uint256 sharesOwner,
        uint256 lootPg,
        uint256 lootCollector,
        uint256 fundsDao
    );

    struct Plot {
        address owner; // current owner
        uint256 stake; // the amount owner has staked
        uint256 foreclosePeriod; // 0 if not or time
        uint256 lastCollectionPeriod; // period
        uint256 price;
        uint24 color;
    }

    // maping of all the plots
    mapping(uint256 => Plot) public plots;

    constructor(
        address _moloch,
        address _token,
        uint256 _periodLength,
        uint256 _cooldown
    ) ERC721("PICO DAO", "PICO") {
        moloch = IMOLOCH(_moloch);
        token = IERC20(_token);
        summoningTime = block.timestamp;
        periodLength = _periodLength;
        gracePeriod = _cooldown;
    }

    // initial discovery of a plot
    function discover(
        address _to,
        uint256 _plotId,
        uint256 _amount
    ) public {
        require(_amount == discoveryFee, "!valid amount");
        // transfer funds to contract owner
        require(
            token.transferFrom(msg.sender, owner(), _amount),
            "Transfer failed"
        );
        require(_plotId <= cap, "!valid");
        require(plots[_plotId].owner == address(0), "discovered");
        _safeMint(_to, _plotId);
        plots[_plotId].owner = _to;
        plots[_plotId].lastCollectionPeriod = getCurrentPeriod();
        plots[_plotId].foreclosePeriod = getCurrentPeriod();
        emit DiscoverFee(_plotId, discoveryFee, owner());
    }

    // claim ownership if foreclosePeriod and not in cooldown
    function reclaim(
        address _to,
        uint256 _plotId,
        uint256 _amount
    ) public {
        // todo: price? it should be 0 if foreclosePeriod?
        require(getCurrentPeriod() != 0, "period0");
        require(_amount == discoveryFee, "!valid amount");
        require(
            token.transferFrom(msg.sender, owner(), _amount),
            "Transfer failed"
        );
        require(_plotId <= cap, "!valid");
        require(plots[_plotId].owner != _to, "owned");
        require(plots[_plotId].owner != address(0), "!discovered");
        require(inForeclosure(_plotId), "!foreclosed");
        require(!inGracePeriod(_plotId), "gracePeriod");
        // transfer ownership to claimer
        transferFromThis(plots[_plotId].owner, _to, _plotId);
        plots[_plotId].owner = _to;
        plots[_plotId].foreclosePeriod = getCurrentPeriod();

        // TODO: event track deposits
        emit DiscoverFee(_plotId, discoveryFee, owner());
    }

    // plot is always for sale. anyone can buy for price
    // price stays the same after purchase
    // buyer is resposible to stake and/or change price
    // back pay of fees are collected
    // current stake is returned to seller
    function buy(
        address _to,
        uint256 _plotId,
        uint256 _amount
    ) public {
        require(_plotId <= cap, "!valid");
        require(plots[_plotId].owner != address(0), "!discovered");
        // collect fees for this plot
        uint256[] memory _plots = new uint256[](1);
        _plots[0] = _plotId;
        collect(_plots);

        require(!inForeclosure(_plotId), "buy:foreclosed"); // if in forclosure should reclaim?
        require(_amount == plots[_plotId].price, "!valid amount");

        if (plots[_plotId].price > 0) {
            require(
                token.transferFrom(
                    msg.sender,
                    plots[_plotId].owner,
                    plots[_plotId].price
                ),
                "Transfer failed"
            );
        }

        // return remaining stake
        require(
            token.transfer(plots[_plotId].owner, plots[_plotId].stake),
            "Transfer failed"
        );
        transferFromThis(plots[_plotId].owner, _to, _plotId);
    }

    // deposit stake on land
    // also pay deposit 'fee' to public goods
    function deposit(
        uint256 _plotId,
        uint256 _periods,
        uint256 _amount
    ) public {
        require(
            _amount >= getFeeAmountByPeriod(_periods, plots[_plotId].price),
            "not enough deposit"
        );
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        // collect back taxes for this plot
        uint256[] memory _plots = new uint256[](1);
        _plots[0] = _plotId;
        collectBeforeDeposit(_plots);

        uint256 newStake = plots[_plotId].stake +
            getFeeAmountByPeriod(_periods, plots[_plotId].price);

        plots[_plotId].stake = newStake;
        plots[_plotId].foreclosePeriod = 0; // not foreclosePeriod now
        emit AddStake(_plotId, newStake);
    }

    // remove any stake deposit after backpay of taxes
    function unstake(uint256 _plotId) public {
        require(_plotId <= cap, "!valid");
        require(plots[_plotId].owner == msg.sender, "!owned");
        require(plots[_plotId].stake != 0, "!stake");
        // TODO: back pay taxes, does collect work here?
        uint256[] memory _plots = new uint256[](1);
        _plots[0] = _plotId;
        collect(_plots);
        plots[_plotId].stake = 0;
        plots[_plotId].foreclosePeriod = getCurrentPeriod();
        require(
            token.transfer(msg.sender, plots[_plotId].stake),
            "Transfer failed"
        );

        emit Unstake(_plotId, plots[_plotId].stake);
    }

    // collect fees and issue dao shares
    // collector gets loot as a reward
    // public goods fund gets loot
    function _collect(uint256[] memory _plotIds, bool _deposit) internal {
        // * updates stake
        // * updates last paid
        // * sets foreclosePeriod
        // * issue collector fee
        // * collect % tax on price set
        // * send tax to dao
        // * issue loot/shares
        for (uint256 i = 0; i < _plotIds.length; i++) {
            require(getCurrentPeriod() != 0, "period0");
            require(_plotIds[i] <= cap, "!valid");
            require(plots[_plotIds[i]].owner != address(0), "!discovered");

            uint256 sharesToGiveOwner;
            uint256 lootToGivePG;
            uint256 LootToGiveCollector;
            uint256 fundsToDao;

            uint256 currentStake = plots[_plotIds[i]].stake;
            uint256 periodsFromCollection = getCurrentPeriod() -
                plots[_plotIds[i]].lastCollectionPeriod;
            // skip if already collected
            if (periodsFromCollection == 0) {
                continue;
            }
            plots[_plotIds[i]].lastCollectionPeriod = getCurrentPeriod(); // update collection

            // foreclosed/grace
            if (inForeclosure(_plotIds[i]) || inGracePeriod(_plotIds[i])) {
                continue;
            }
            // collector gets collection fee in loot
            LootToGiveCollector = periodsFromCollection * collectionRate;
            giveLoot(msg.sender, LootToGiveCollector);

            // collect any current taxes and update stake

            if (
                currentStake >
                getFeeAmountByPeriod(
                    periodsFromCollection,
                    plots[_plotIds[i]].price
                )
            ) {
                // has enough to pay
                // send collection to dao
                fundsToDao = getFeeAmountByPeriod(
                    periodsFromCollection,
                    plots[_plotIds[i]].price
                );
                require(
                    token.transfer(address(moloch), fundsToDao),
                    "Transfer failed"
                );
                // issue shares for collection paid
                // amount of tax paid minus the collection fee
                // get amount of fees and taxes
                // devide by base price to get whole number
                // multiple by unit per to get total shares
                // subtract what has alreay been paid to collector
                // could make it <= 0
                sharesToGiveOwner = ((getFeeAmountByPeriod(
                    periodsFromCollection,
                    plots[_plotIds[i]].price
                ) / basePrice) * unitPer);
                // will need to check fo underflow here
                // - (periodsFromCollection * collectionRate);
                giveShares(plots[_plotIds[i]].owner, sharesToGiveOwner);

                // issue loot to public goods fund
                // flat rate that dilutes the share holders
                lootToGivePG = periodsFromCollection * publicGoodRate;
                giveLoot(owner(), lootToGivePG);
                plots[_plotIds[i]].stake = (currentStake -
                    getFeeAmountByPeriod(
                        periodsFromCollection,
                        plots[_plotIds[i]].price
                    ));
            } else {
                fundsToDao = currentStake;
                require(
                    token.transfer(address(moloch), fundsToDao),
                    "Transfer failed"
                );
                sharesToGiveOwner = (currentStake / basePrice) * unitPer;
                // need to check for underflow
                // - (periodsFromCollection * collectionRate)

                giveShares(plots[_plotIds[i]].owner, sharesToGiveOwner);

                // public goods dilution
                lootToGivePG = periodsFromCollection * publicGoodRate;
                giveLoot(owner(), lootToGivePG);
                plots[_plotIds[i]].stake = 0;
                plots[_plotIds[i]].foreclosePeriod = getCurrentPeriod();
                if (!_deposit) {
                    plots[_plotIds[i]].price = 0;
                }
            }

            // TODO: if there is a token balance
            if (fundsToDao > 0) {
                moloch.collectTokens(address(token));
            }
            // TODO: event track deposits
            emit Collection(
                sharesToGiveOwner,
                lootToGivePG,
                LootToGiveCollector,
                fundsToDao
            );
        }
    }

    function giveShares(address _to, uint256 _shares) internal {
        moloch.setSingleSharesLoot(_to, _shares, 0, true);
    }

    function giveLoot(address _to, uint256 _loot) internal {
        moloch.setSingleSharesLoot(_to, 0, _loot, true);
    }

    function collect(uint256[] memory _plotIds) public {
        _collect(_plotIds, false);
    }

    function collectBeforeDeposit(uint256[] memory _plotIds) internal {
        _collect(_plotIds, true);
    }

    function transferFromThis(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        //solhint-disable-next-line max-line-length
        require(
            _isThis(address(this), tokenId),
            "ERC721: transfer caller is not owner, admin nor approved"
        );

        _transfer(from, to, tokenId);
    }

    function _isThis(address spender, uint256 tokenId)
        internal
        view
        virtual
        returns (bool)
    {
        require(
            _exists(tokenId),
            "ERC721: operator query for nonexistent token"
        );
        return (spender == address(this));
    }

    function tax(uint256 _price) public view returns (uint256) {
        // should get %
        return (_price / 100) * taxRate;
    }

    function getFeeAmountByPeriod(uint256 _periods, uint256 _plotPrice)
        public
        view
        returns (uint256)
    {
        return _periods * (depositFee + tax(_plotPrice));
    }

    function setPrice(uint256 _plotId, uint256 _price) public {
        // TODO: should only be able to set price if land is not in forclousure cooldown
        // TODO: set price and deposit

        require(_price % basePrice == 0, "price invalid");
        plots[_plotId].price = _price;

        emit SetPrice(_plotId, _price);
    }

    function setMeta(uint256 _plotId, uint24 _color) public {
        plots[_plotId].color = _color;
        emit SetMeta(_plotId, _color);
    }

    function updateConfig(
        uint256 _discoveryFee,
        uint256 _collectionRate,
        uint256 _depositFee,
        uint256 _basePrice,
        uint256 _publicGoodRate,
        uint256 _taxRate,
        uint256 _periodLength,
        uint256 _gracePeriod
    ) public onlyOwner {
        discoveryFee = _discoveryFee;
        collectionRate = _collectionRate;
        depositFee = _depositFee;
        basePrice = _basePrice;
        publicGoodRate = _publicGoodRate;
        taxRate = _taxRate;
        periodLength = _periodLength;
        gracePeriod = _gracePeriod;
    }

    function inGracePeriod(uint256 _plotId) public view returns (bool) {
        return
            plots[_plotId].foreclosePeriod + gracePeriod > getCurrentPeriod();
    }

    function inForeclosure(uint256 _plotId) public view returns (bool) {
        return
            plots[_plotId].foreclosePeriod != 0 &&
            plots[_plotId].foreclosePeriod <= getCurrentPeriod();
    }

    function getCurrentPeriod() public view returns (uint256) {
        return (block.timestamp - summoningTime) / (periodLength);
    }
}
