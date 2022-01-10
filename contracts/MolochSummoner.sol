// Based on https://github.com/HausDAO/Molochv2.1

pragma solidity 0.6.1;

import "./interfaces/IERC20.sol";
import "./Moloch.sol";

/*
The MIT License (MIT)
Copyright (c) 2018 Murray Software, LLC.
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
contract CloneFactory { // implementation of eip-1167 - see https://eips.ethereum.org/EIPS/eip-1167
    function createClone(address target) internal returns (address result) {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(clone, 0x14), targetBytes)
            mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            result := create(0, clone, 0x37)
        }
    }
}

contract MolochSummoner is CloneFactory {
    address public template;
    mapping(uint256 => address) public daos;
    uint256 public daoIdx = 0;

    // Moloch private moloch; // moloch contract

    constructor(address _template) public {
        template = _template;
    }

    event SummonComplete(
        address indexed moloch,
        address _shaman,
        address[] tokens,
        uint256 summoningTime,
        uint256 periodDuration,
        uint256 votingPeriodLength,
        uint256 gracePeriodLength,
        uint256 proposalDeposit,
        uint256 dilutionBound,
        uint256 processingReward
    );

    function summonMoloch(
        address _summoner,
        address _shaman,
        address[] memory _approvedTokens,
        uint256 _periodDuration,
        uint256 _votingPeriodLength,
        uint256 _gracePeriodLength,
        uint256 _proposalDeposit,
        uint256 _dilutionBound,
        uint256 _processingReward
    ) public returns (address) {
        Moloch moloch = Moloch(createClone(template));

        moloch.init(
            _summoner,
            _shaman,
            _approvedTokens,
            _periodDuration,
            _votingPeriodLength,
            _gracePeriodLength,
            _proposalDeposit,
            _dilutionBound,
            _processingReward
        );

        daoIdx = daoIdx + 1;
        daos[daoIdx] = address(moloch);
        emit SummonComplete(
            address(moloch),
            _shaman,
            _approvedTokens,
            now,
            _periodDuration,
            _votingPeriodLength,
            _gracePeriodLength,
            _proposalDeposit,
            _dilutionBound,
            _processingReward
        );

        return address(moloch);
    }
}