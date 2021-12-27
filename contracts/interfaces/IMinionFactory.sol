interface IMinionFactory {
    function summonMinionAndSafe(
        address,
        string memory,
        uint256,
        uint256
    ) external returns (address);
}