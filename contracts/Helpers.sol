// Based on https://github.com/HausDAO/MinionSummoner/blob/main/MinionFactory.sol

// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;


import "./interfaces/IMoloch.sol";

contract DaoConditionalHelper {

    function isDaoMember(address user, address dao) public view {
        // member only check should check if member or delegate
        IMOLOCH moloch = IMOLOCH(dao);
        address memberAddress = moloch.memberAddressByDelegateKey(user);
        (, uint shares,,,,) = moloch.members(memberAddress);
        require(shares > 0, "Is Not Dao Member");
    }

    function isNotDaoMember(address user, address dao) public view {
        // member only check should check if member or delegate
        IMOLOCH moloch = IMOLOCH(dao);
        address memberAddress = moloch.memberAddressByDelegateKey(user);
        (, uint shares,,,,) = moloch.members(memberAddress);
        require(shares == 0, "Is Not Dao Member");
    }

    function isAfter(uint256 timestamp) public view {
        require(timestamp < block.timestamp, "timestamp not meet");
    }

}