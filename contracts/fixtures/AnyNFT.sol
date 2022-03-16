pragma solidity ^0.8.4;

//SPDX-License-Identifier: MIT

//import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
//learn more: https://docs.openzeppelin.com/contracts/3.x/erc721


contract AnyNFT is ERC721 {

  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  constructor() ERC721("AnyNFT", "ANFT") {
  }

  function _baseURI() internal pure override returns (string memory) {
        return "https://daohaus.mypinata.cloud/ipfs/";
    }

  function mintItem(address to)
      public
      returns (uint256)
  {
      _tokenIds.increment();

      uint256 id = _tokenIds.current();
      _mint(to, id);

      return id;
  }
  
}
