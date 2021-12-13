pragma solidity ^0.6.1;

import "./MolochSummoner.sol";
import "./Wrapper.sol";

contract Yeeter {
    event Received(address, uint256);
    mapping(address => uint256) public deposits;
    uint256 maxTarget;
    uint256 raiseEndTime;
    uint256 raiseStartTime;
    uint256 maxUnitsPerAddr; 
    uint256 pricePerUnit;
    uint256 lootPerUnit = 100;
    uint256 fee = 3;

    uint256 balance;
    Moloch public moloch;
    address public uhMoloch;
    Wrapper public wrapper;

    function init(
        address _moloch,
        address _uhMoloch,
        address payable _wrapper,
        uint256 _maxTarget, // max raise target
        uint256 _raiseEndTime,
        uint256 _raiseStartTime,
        uint256 _maxUnits, // per individual
        uint256 _pricePerUnit
    ) public {
        require(address(moloch) == address(0), "already init");
        moloch = Moloch(_moloch);
        wrapper = Wrapper(_wrapper);
        uhMoloch = _uhMoloch;

        maxTarget = _maxTarget;
        raiseEndTime = _raiseEndTime;
        raiseStartTime = _raiseStartTime;
        maxUnitsPerAddr = _maxUnits;
        pricePerUnit = _pricePerUnit;

    }

    // set sumoners (share holders)
    receive() external payable {
        require(address(moloch) != address(0), "!init");
        require(msg.value > pricePerUnit, "< minimum");
        require(balance < maxTarget, "Max Target reached"); // balance plus newvalue
        require(block.timestamp < raiseEndTime, "Time is up");
        require(block.timestamp > raiseStartTime, "Not Started");
        uint256 numUnits = msg.value / pricePerUnit; // floor units
        uint256 newValue = numUnits * pricePerUnit;
        
        // if some one yeets over max should we give them the max and return leftover.
        require(
            deposits[msg.sender] + newValue <= maxUnitsPerAddr * pricePerUnit,
            "can not deposit more than max"
        );

        // wrap
        (bool success, ) = address(wrapper).call.value(newValue)("");
        require(success, "wrap failed");
        // send to dao
        require(
            wrapper.transfer(address(moloch), newValue),
            "transfer failed"
        );

        if (msg.value > newValue) {
            // Return the extra money to the minter.
            (bool success2, ) = msg.sender.call.value(msg.value - newValue)("");
            require(success2, "Transfer failed");
        }

        deposits[msg.sender] = deposits[msg.sender] + newValue;

        balance = balance + newValue;

        uint256 lootToUh = numUnits * fee;
        uint256 lootToGive = (numUnits * lootPerUnit) - lootToUh;

        uint256[] memory _summonerShares = new uint256[](2);
         _summonerShares[0] = uint256(0);
         _summonerShares[1] = uint256(0);
        uint256[] memory _summonerLoot = new uint256[](2);
        _summonerLoot[0] = uint256(lootToGive);
        _summonerLoot[1] = uint256(lootToUh);
        address[] memory _msgSender = new address[](2);
        _msgSender[0] = msg.sender;
        _msgSender[1] = address(uhMoloch);

        moloch.setSharesLoot(_msgSender, _summonerShares, _summonerLoot, true);

        moloch.collectTokens(address(wrapper));

        emit Received(msg.sender, newValue);
    }

    function goalReached() public view returns (bool) {
        return balance >= maxTarget;
    }
}


contract YeetSummoner is CloneFactory {
    address payable public template;
    mapping(uint256 => address) public yeeters;
    uint256 public yeetIdx = 0;

    // Moloch private moloch; // moloch contract

    constructor(address payable _template) public {
        template = _template;
    }

    event SummonYeetComplete(
        address indexed moloch,
        address uhMoloch,
        address wrapper,
        uint256 maxTarget,
        uint256 raiseEndTime,
        uint256 raiseStartTime,
        uint256 maxUnits,
        uint256 pricePerUnit
    );


    function summonYeet(
        address _moloch,
        address _uhMoloch,
        address payable _wrapper,
        uint256 _maxTarget,
        uint256 _raiseEndTime,
        uint256 _raiseStartTime,
        uint256 _maxUnits,
        uint256 _pricePerUnit
    ) public returns (address) {
        Yeeter yeeter = Yeeter(payable(createClone(template)));

        yeeter.init(
        _moloch,
        _uhMoloch,
        _wrapper,
        _maxTarget,
        _raiseEndTime,
        _raiseStartTime,
        _maxUnits,
        _pricePerUnit
        );
        yeetIdx = yeetIdx + 1;
        yeeters[yeetIdx] = address(yeeter);
        emit SummonYeetComplete(
        _moloch,
        _uhMoloch,
        _wrapper,
        _maxTarget,
        _raiseEndTime,
        _raiseStartTime,
        _maxUnits,
        _pricePerUnit
        );

        return address(yeeter);
    }

}