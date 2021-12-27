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