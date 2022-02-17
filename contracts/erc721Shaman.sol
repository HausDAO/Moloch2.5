// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./libraries/base64.sol";

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
}

contract Daogroni is ERC721, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    IMOLOCH public moloch;
    IWRAPPER public wrapper;
    uint256 public price = 300000000000000000;
    uint256 public cap = 200;
    uint256 public lootPerUnit = 100;
    uint256 public platformFee = 3;

    string folder = "QmaCBoYHdQ9u7zwp1Sxxaig1yfuocTLzk9iAr1m1ahukBK";
    string[5] names = ["boulevardier","BermudaHundred", "daogroni-manhatten","negroni","whtnegroni"];
    // daogroni-boulevardier
    mapping(uint256 => uint256) public orders;
    mapping(uint256 => bool) public redeems;

    constructor(address _moloch, address _wrapper) ERC721("Daogroni", "GRONI") {
        moloch = IMOLOCH(_moloch);
        wrapper = IWRAPPER(_wrapper);

    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://daohaus.mypinata.cloud/ipfs/";
    }

    function orderDrink(address _to, uint256 _orderId) public payable {
        require(msg.value > price, "not enough to order");
        uint256 tokenId = _tokenIdCounter.current();
        require( tokenId < cap, "bar is empty");
        // wrap
        (bool success, ) = address(wrapper).call{value: price}("");
        require(success, "Wrap failed");
        // send to dao
        require(wrapper.transfer(address(moloch), price), "Transfer failed");

        if (msg.value > price) {
            // Return the extra money to the minter.
            (bool success2, ) = msg.sender.call{
                value: msg.value - price
            }("");
            require(success2, "Transfer failed.");
        }

        _tokenIdCounter.increment();
        orders[tokenId+1] = _orderId;
        _safeMint(_to, tokenId+1);
        
        moloch.setSingleSharesLoot(
            owner(),
            0,
            platformFee + lootPerUnit,
            true
        );
        
        moloch.collectTokens(address(wrapper));

    }

    function redeem(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "must own token");
        redeems[tokenId] = true;
        moloch.setSingleSharesLoot(owner(), 0, lootPerUnit, false);
        moloch.setSingleSharesLoot(msg.sender, 0, lootPerUnit, true);

    }

    function _drinkState(uint256 _tokenId)
        internal
        view
        returns (string memory) {
            if(redeems[_tokenId]) {
                return string("-empty");
            } else {
                return string("");
            }
        }

    /**  Constructs the tokenURI, separated out from the public function as its a big function.
     * Generates the json data URI and svg data URI that ends up sent when someone requests the tokenURI
     * svg has a image tag that can be updated by the owner (dao)
     * param: _tokenId the tokenId
     */
    function _constructTokenURI(uint256 _tokenId)
        internal
        view
        returns (string memory)
    {
        string memory _nftName = string(abi.encodePacked("DAOgroni ", names[orders[_tokenId]]));

        string memory _metadataSVGs = string(
            abi.encodePacked(
                '<image width="100%" href="',
                _baseURI(),
                folder,
                "/daogroni-",
                names[orders[_tokenId]],
                _drinkState(_tokenId),
                ".svg",
                '" />'
            )
        );

        bytes memory svg = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 306" preserveAspectRatio="xMidYMid meet" style="font:14px serif"><rect width="330" height="306" fill="#1a2954" />',
            _metadataSVGs,
            "</svg>"
        );

        bytes memory _image = abi.encodePacked(
            "data:image/svg+xml;base64,",
            Base64.encode(bytes(svg))
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                _nftName,
                                '", "image":"',
                                _image,
                                // Todo something clever
                                '", "description": "Drink Responsibly"}'
                            )
                        )
                    )
                )
            );
    }

    /* Returns the json data associated with this token ID
     * param _tokenId the token ID
     */
    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        return string(_constructTokenURI(_tokenId));
    }
}
