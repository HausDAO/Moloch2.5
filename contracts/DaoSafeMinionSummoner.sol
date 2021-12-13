pragma solidity ^0.8.0;
pragma abicoder v2;
// SPDX-License-Identifier: GPL-3.0-or-later

import "hardhat/console.sol";

interface IMinionFactory {
    function summonMinionAndSafe(
        address,
        string memory,
        uint256,
        uint256
    ) external returns (address);
}

interface IMolochFactory {
    function summonMoloch(
        address,
        address,
        address[] memory,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    ) external returns (address);
}

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

    function setShaman(address, bool) external;
}

/// @title SafeMinionSummoner - Factory contract to depoy new Minions and Safes
/// @dev Can deploy a minion and a new safe, or just a minion to be attached to an existing safe
/// @author Isaac Patka, Dekan Brown
contract DaoSafeMinionSummoner {
    // summoners
    IMinionFactory public minionSummoner;
    IMolochFactory public daoSummoner;

    /// @dev Construtor sets the initial templates
    /// @notice Can only be called once by factory

    constructor(address _minionSummoner, address _daoSummoner) {
        minionSummoner = IMinionFactory(_minionSummoner);
        daoSummoner = IMolochFactory(_daoSummoner);
        console.log("addrs in contract", address(minionSummoner), address(daoSummoner));
    }

    /// @dev Function to summon minion and configure with a new safe
    /// @param _saltNonce Number used to calculate the address of the new minion
    function summonDaoMinionAndSafe(
        uint256 _saltNonce,
        uint256 _periodDuration,
        uint256 _votingPeriodLength,
        uint256 _gracePeriodLength,
        address[] calldata _approvedTokens
    ) external returns (address, address) {
        // Deploy new minion but do not set it up yet
        console.log("fffffffffffffffffffffff in contract", address(this));
        console.log("fffffffffffffffffffffff in contract", address(daoSummoner));

        address _moloch = daoSummoner.summonMoloch(
            msg.sender, // summoner
            address(this), // _shaman,
            _approvedTokens,
            _periodDuration,
            _votingPeriodLength,
            _gracePeriodLength,
            0, // deposit
            3, // dillution bound
            0  // reward
        );
        console.log("f in contract", _moloch, _saltNonce, address(this));

        address _minion = minionSummoner.summonMinionAndSafe(
            _moloch,
            "This is the details",
            0,
            _saltNonce
        );

        return (_moloch, _minion);
    }

    function setUpDaoMinionAndSafe(
        address _moloch,
        address _minion,
        address[] memory _summoners,
        uint256[] memory _summonerShares,
        uint256[] memory _summonerLoot
    ) public {
        IMOLOCH molochContract = IMOLOCH(_moloch);

        molochContract.setSharesLoot(
            _summoners,
            _summonerShares,
            _summonerLoot,
            true
        );
        molochContract.setShaman(_minion, true);
    }
}
