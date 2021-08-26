// SPDX-License-Identifier: LGPL-3.0-only
import "hardhat/console.sol";

pragma solidity >=0.8.0;

contract TestExecutor {
    address public module;

    receive() external payable {}

    function setModule(address _module) external {
        module = _module;
    }

    function exec(address payable to, uint256 value, bytes calldata data) external {
        bool success;
        bytes memory response;
        (success, response) = to.call{value: value}(data);
        if(!success) {
            assembly {
                revert(add(response, 0x20), mload(response))
            }
        }
    }

    function execTransactionFromModule(address payable to, uint256 value, bytes calldata data, uint8 operation)
        external
        returns (bool success)
    {
        console.log('DEBUG ETFM %s', operation);
        require(msg.sender == module, "Not authorized");
        if (operation == 1)
            (success,) = to.delegatecall(data);
        else
            (success,) = to.call{value: value}(data);
    }
}