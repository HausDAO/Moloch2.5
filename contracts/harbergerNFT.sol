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

contract HarbergerNft is ERC721, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    IMOLOCH public moloch;
    IERC20 public token;

    uint256 public discoveryFee = 10000000000000000; // fee to discover new
    uint256 collectionFee = 3; // fee for colector
    uint256 public depositFee = 10000000000000000; // fee to deposit
    uint256 rate = 3; // public goods fund, dillutes dao
    uint256 taxRate = 3; // global tax rate
    uint256 lootPer = 100; // loot per deposit payment
    uint256 public periodLength; // length of a deposit period
    uint256 public coolDown; // cool down before fair game
    uint256 summoningTime; // time the game is launched
    uint256 cap = 900; // 30 x 30 grid

    // TODO
    // dao (owner) can change fees and rates

    struct Plot {
        address owner; // current owner
        uint256 stake; // the amount owner has staked
        uint256 forclosePeriod; // 0 if not or time
        uint256 lastCollectionPeriod; // period
        uint256 price;
    }

    // maping of all the plots
    mapping(uint256 => Plot) public plots;

    constructor(
        address _moloch,
        address _token,
        uint256 _periodLength,
        uint256 _cooldown
    ) ERC721("Daogroni", "GRONI") {
        moloch = IMOLOCH(_moloch);
        token = IERC20(_token);
        summoningTime = block.timestamp;
        periodLength = _periodLength;
        coolDown = _cooldown;
    }

    // initial discovery of a plot
    function discover(
        address _to,
        uint256[] calldata _plotIds,
        uint256 _amount
    ) public {
        require(_amount == _plotIds.length * discoveryFee, "!valid amount");
        require(
            token.transferFrom(msg.sender, owner(), _amount),
            "Transfer failed"
        );

        for (uint256 i = 0; i < _plotIds.length; i++) {
            require(_plotIds[i] <= cap, "!valid");
            require(plots[_plotIds[i]].owner == address(0), "discovered");
            _safeMint(_to, _plotIds[i]);
            plots[_plotIds[i]].owner = _to;
            plots[_plotIds[i]].lastCollectionPeriod = getCurrentPeriod();
            plots[_plotIds[i]].forclosePeriod = getCurrentPeriod();
        }
    }

    // claim ownership if forclosePeriod and not in cooldown
    function reclaim(
        address _to,
        uint256[] calldata _plotIds,
        uint256 _amount
    ) public {
        // todo: price? it should be 0 if forclosePeriod?
        require(getCurrentPeriod() != 0, "period0");
        require(_amount == _plotIds.length * discoveryFee, "!valid amount");
        require(
            token.transferFrom(msg.sender, owner(), _amount),
            "Transfer failed"
        );

        for (uint256 i = 0; i < _plotIds.length; i++) {
            require(_plotIds[i] <= cap, "!valid");
            require(plots[_plotIds[i]].owner != _to, "owned");
            require(plots[_plotIds[i]].owner != address(0), "!discovered");

            require(plots[_plotIds[i]].forclosePeriod > 0, "!forclosePeriod");
            require(
                plots[_plotIds[i]].forclosePeriod + coolDown <
                    getCurrentPeriod(),
                "coolDown"
            );
            // transfer ownership to claimer
            transferFromThis(plots[_plotIds[i]].owner, _to, _plotIds[i]);
            plots[_plotIds[i]].owner = _to;
            plots[_plotIds[i]].forclosePeriod = getCurrentPeriod();
            // TODO: set or refund stake? I don't think there should be
            // should loot/shares go to someone?
        }
    }

    // plot is always for sale. anyone can buy for price set plus 2x discoveryFee
    // price stays the same after purchase
    // buyer is resposible to stake and change price
    // current stake should be returned to seller
    // back pay of fees should be collected
    function buy(
        address _to,
        uint256 _plotId,
        uint256 _amount
    ) public {
        require(_plotId <= cap, "!valid");
        require(plots[_plotId].owner != address(0), "!discovered");
        // todo: is this really needed? fine if they only get loot
        // require(plots[_plotId].owner != _to, "can not buy from self");
        require(
            _amount == (discoveryFee * 2) + plots[_plotId].price,
            "!valid amount"
        );
        // collect fees for this plot
        uint256[] memory _plots = new uint256[](1);
        _plots[0] = _plotId;
        collect(_plots);
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

        require(
            token.transferFrom(msg.sender, address(moloch), (discoveryFee * 2)),
            "Transfer failed"
        );
        // return remaining stake
        require(
            token.transfer(
                plots[_plotId].owner,
                plots[_plotId].stake
            ),
            "Transfer failed"
        );
        transferFromThis(plots[_plotId].owner, _to, _plotId);
        // give loot as some incentive to use this to buy
        // one loot unit for buyer and seller discovery fee
        // shares could be gamed by Sybil
        moloch.setSingleSharesLoot(plots[_plotId].owner, 0, lootPer, true);
        moloch.setSingleSharesLoot(_to, 0, lootPer, true);
    }

    // deposit fee
    function deposit(
        uint256[] calldata _plotIds,
        uint256 _periods,
        uint256 _amount
    ) public {
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        collect(_plotIds);
        // add new deposit stake
        for (uint256 i = 0; i < _plotIds.length; i++) {
            require(
                _amount >= amountByPeriod(_periods, plots[_plotIds[i]].price),
                "not enough deposit"
            );
            plots[_plotIds[i]].stake =
                plots[_plotIds[i]].stake +
                amountByPeriod(_periods, plots[_plotIds[i]].price);
            plots[_plotIds[i]].forclosePeriod = 0; // not forclosePeriod now
        }
    }

    // remove deposit
    function unstake(uint256[] calldata _plotIds) public {
        for (uint256 i = 0; i < _plotIds.length; i++) {
            require(_plotIds[i] <= cap, "!valid");
            require(plots[_plotIds[i]].owner == msg.sender, "owned");
            require(plots[_plotIds[i]].stake != 0, "!no stake");
            // TODO: back pay taxes, does collect work here?
            collect(_plotIds);
            plots[_plotIds[i]].stake = 0;
            plots[_plotIds[i]].forclosePeriod = getCurrentPeriod();
            require(
                token.transferFrom(
                    address(this),
                    msg.sender,
                    plots[_plotIds[i]].stake
                ),
                "Transfer failed"
            );
        }
    }

    // collect fees and issue dao membership
    // collector gets loot as a reward
    // public goods fund gets loot
    function collect(uint256[] memory _plotIds) public {
        // * updates stake
        // * updates last paid
        // * sets forclosePeriod
        // * collector fee
        // * collect % tax on price set
        // * send tax to dao
        // * issue loot/shares
        for (uint256 i = 0; i < _plotIds.length; i++) {
            require(getCurrentPeriod() != 0, "period0");
            console.log(
                "collect in cool down",
                plots[_plotIds[i]].forclosePeriod + coolDown
            );
            console.log("collect in current period", getCurrentPeriod());

            require(
                plots[_plotIds[i]].forclosePeriod + coolDown <
                    getCurrentPeriod(),
                "coolDown"
            );
            require(_plotIds[i] <= cap, "!valid");
            require(plots[_plotIds[i]].owner != address(0), "!discovered");
            console.log("forclosePeriod", plots[_plotIds[i]].forclosePeriod);
            console.log("current period", getCurrentPeriod());
            // require(, "forclosePeriod"); // if forclosePeriod you can't collect only reclaim

            uint256 currentStake = plots[_plotIds[i]].stake;
            uint256 periodsFromCollection = getCurrentPeriod() -
                plots[_plotIds[i]].lastCollectionPeriod;
            console.log("periodsFromCollection", periodsFromCollection);
            if (periodsFromCollection <= 0) {
                continue;
            }
            // collector gets collection fee
            uint256 totalCollectionFee = periodsFromCollection * collectionFee;
            moloch.setSingleSharesLoot(msg.sender, 0, totalCollectionFee, true);

            // collect any current fees and update stake
            // if forclosePeriod, collect all current stake
            if (
                currentStake >
                amountByPeriod(periodsFromCollection, plots[_plotIds[i]].price)
            ) {
                console.log(">>>>", periodsFromCollection);
                console.log(">>>>", plots[_plotIds[i]].price);
                require(
                    token.transfer(
                        address(moloch),
                        amountByPeriod(
                            periodsFromCollection,
                            plots[_plotIds[i]].price
                        )
                    ),
                    "Transfer failed"
                );
                // issue shares for collection paid
                // TODO: issue shares for tax this is not right (tax(plots[_plotIds[i]].price) / depositFee)
                moloch.setSingleSharesLoot(
                    plots[_plotIds[i]].owner,
                    ((periodsFromCollection +
                        (tax(plots[_plotIds[i]].price) / depositFee)) *
                        lootPer) - totalCollectionFee,
                    0,
                    true
                );
                // issue loot to public goods fund
                moloch.setSingleSharesLoot(
                    owner(),
                    0,
                    periodsFromCollection * rate,
                    true
                );
                plots[_plotIds[i]].stake = (currentStake -
                    amountByPeriod(
                        periodsFromCollection,
                        plots[_plotIds[i]].price
                    ));
            } else {
                require(
                    token.transferFrom(
                        address(this),
                        address(moloch),
                        currentStake
                    ),
                    "Transfer failed"
                );
                uint256 remained = (currentStake % depositFee) +
                    tax(plots[_plotIds[i]].price);
                moloch.setSingleSharesLoot(
                    plots[_plotIds[i]].owner,
                    remained * lootPer,
                    0,
                    true
                );
                moloch.setSingleSharesLoot(owner(), 0, remained * rate, true);
                plots[_plotIds[i]].stake = 0;
                plots[_plotIds[i]].forclosePeriod = getCurrentPeriod();
            }

            plots[_plotIds[i]].lastCollectionPeriod = getCurrentPeriod();
            // if there is a token balance
            // moloch.collectTokens(address(token));
        }
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
        return _price * taxRate;
    }

    function amountByPeriod(uint256 _periods, uint256 _plotPrice)
        public
        view
        returns (uint256)
    {
        return _periods * (depositFee + tax(_plotPrice));
    }

    function setPrice(uint256 _plotId, uint256 _price) public {
        plots[_plotId].price = _price;
    }

    // function setMeta(uint256[] calldata _plotIds) public  {
    //     require(true, "owned");
    //     // * fee to factory
    // }

    // is forclosePeriod
    // is in cooldown

    function getCurrentPeriod() public view returns (uint256) {
        return (block.timestamp - summoningTime) / (periodLength);
    }
}
