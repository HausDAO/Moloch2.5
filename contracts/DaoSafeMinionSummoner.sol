pragma solidity ^0.8.0;
pragma abicoder v2;

// SPDX-License-Identifier: GPL-3.0-or-later
// import "hardhat/console.sol";

import "./interfaces/IMinionFactory.sol";
import "./interfaces/IMolochFactory.sol";
import "./interfaces/IMoloch.sol";

/// @title SafeMinionSummoner - Factory contract to depoy new Minions and Safes
/// @dev Can deploy a minion and a new safe, or just a minion to be attached to an existing safe
/// @author Isaac Patka, Dekan Brown
contract DaoSafeMinionSummoner {
    IMinionFactory public minionSummoner;
    IMolochFactory public daoSummoner;

    struct DSM {
        address moloch;
        address minion;
    }

    mapping(uint256 => DSM) public daos;
    uint256 public daoIdx = 0;

    event SummonComplete(
        address summoner,
        address indexed moloch,
        address _minion,
        address[] tokens,
        uint256 periodDuration,
        uint256 votingPeriodLength,
        uint256 gracePeriodLength,
        string details
    );

    event SetupComplete(
            address indexed _moloch,
            address _shaman,
            address[] _summoners,
            uint256[] _summonerShares,
            uint256[] _summonerLoot
        );

    constructor(address _minionSummoner, address _daoSummoner) {
        minionSummoner = IMinionFactory(_minionSummoner);
        daoSummoner = IMolochFactory(_daoSummoner);
    }

    /// @dev Function to summon minion and configure with a new safe and a dao
    function summonDaoMinionAndSafe(
        uint256 _saltNonce,
        uint256 _periodDuration,
        uint256 _votingPeriodLength,
        uint256 _gracePeriodLength,
        address[] calldata _approvedTokens,
        string calldata details
    ) external returns (address _moloch, address _minion) {
        // Deploy new minion but do not set it up yet

        _moloch = daoSummoner.summonMoloch(
            msg.sender, // summoner
            address(this), // _shaman,
            _approvedTokens,
            _periodDuration,
            _votingPeriodLength,
            _gracePeriodLength,
            0, // deposit
            3, // dillution bound
            0 // reward
        );

        _minion = minionSummoner.summonMinionAndSafe(
            _moloch,
            "This is the details",
            0,
            _saltNonce
        );

        daoIdx = daoIdx + 1;
        daos[daoIdx] = DSM(_moloch, _minion);
        emit SummonComplete(
            msg.sender, // summoner
            _moloch,
            _minion,
            _approvedTokens,
            _periodDuration,
            _votingPeriodLength,
            _gracePeriodLength,
            details
        );
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
        
        emit SetupComplete(
            _moloch,
            _minion,
            _summoners,
            _summonerShares,
            _summonerLoot
        );
    }
}
