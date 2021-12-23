// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "hardhat/console.sol";
interface IMOLOCH {
    // brief interface for moloch dao v2

    function depositToken() external view returns (address);

    function tokenWhitelist(address token) external view returns (bool);

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

contract Dripper {
    event Received(address, uint256);
    mapping(uint256 => mapping(address => bool)) public claims;
    uint256 public dripEndTime;
    uint256 public dripStartTime;
    uint256 public periodDuration;
    uint256 public currentPeriod;
    bool public dripShares;
    uint256 public dripPerUnit;

    IMOLOCH public moloch;

    function init(
        address _moloch,
        uint256 _dripEndTime, // end drip
        uint256 _dripStartTime, // start dip
        uint256 _periodDuration, // length of drip window
        bool _dripShares, // shares or loot
        uint256 _dripPerUnit // amount to drip
    ) public {
        require(address(moloch) == address(0), "already init");
        moloch = IMOLOCH(_moloch);
        dripEndTime = _dripEndTime;
        dripStartTime = _dripStartTime;
        periodDuration = _periodDuration;
        dripShares = _dripShares;
        dripPerUnit = _dripPerUnit;

    }

    function claim() public returns (bool) {
        require(!claims[getCurrentPeriod()][msg.sender], "already claimed");
        claims[getCurrentPeriod()][msg.sender] = true;
        if (dripShares) {
            moloch.setSingleSharesLoot(msg.sender, dripPerUnit, 0, true);
        } else {
            moloch.setSingleSharesLoot(msg.sender, 0, dripPerUnit, true);
        }
        emit Received(msg.sender, dripPerUnit);
        return true;
    }

    function getCurrentPeriod() public view returns (uint256) {
        return (block.timestamp - dripStartTime) / (periodDuration);
    }
}

contract CloneFactory {
    // implementation of eip-1167 - see https://eips.ethereum.org/EIPS/eip-1167
    function createClone(address target) internal returns (address result) {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let clone := mload(0x40)
            mstore(
                clone,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            mstore(add(clone, 0x14), targetBytes)
            mstore(
                add(clone, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            result := create(0, clone, 0x37)
        }
    }
}

contract DripSummoner is CloneFactory {
    address payable public template;
    mapping(uint256 => address) public drippers;
    uint256 public dripIdx = 0;

    // Moloch private moloch; // moloch contract

    constructor(address payable _template) {
        template = _template;
    }

    event SummonDripComplete(
        address indexed _moloch,
        address dripper,
        string details
    );

    // details?
    function summonDrip(
        address _moloch,
        uint256 _dripEndTime, // end drip
        uint256 _dripStartTime, // start dip
        uint256 _periodDuration, // length of drip window
        bool _dripShares, // shares or loot
        uint256 _dripPerUnit, // amount to drip
        string calldata _details
    ) public returns (address) {
        Dripper dripper = Dripper(payable(createClone(template)));

        dripper.init(
            _moloch,
            _dripEndTime,
            _dripStartTime,
            _periodDuration,
            _dripShares,
            _dripPerUnit
        );
        dripIdx = dripIdx + 1;
        drippers[dripIdx] = address(dripper);

        emit SummonDripComplete(_moloch, address(dripper), _details);

        return address(dripper);
    }
}
