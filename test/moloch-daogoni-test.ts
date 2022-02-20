import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { use, expect } from "chai";
import { ContractFactory } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Moloch } from "../src/types/Moloch";
import { Daogroni } from "../src/types/Daogroni";
import { MolochSummoner } from "../src/types/MolochSummoner";
import { YeetSummoner } from "../src/types/YeetSummoner";
import { Wrapper } from "../src/types/Wrapper";

use(solidity);

describe.only("Moloch Daogroni Summoner", function () {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let Moloch: ContractFactory;
  let Daogroni: ContractFactory;
  let MolochSummoner: ContractFactory;
  let Wrapper: ContractFactory;
  let molochSummoner: MolochSummoner;
  let moloch: Moloch;
  let daogroni: Daogroni;
  let wrapper: Wrapper;

  let daogroniContract: Daogroni;
  let molochContract: Moloch;
  let molochUhContract: Moloch;

  const zeroAddr = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    signers = await ethers.getSigners();
    owner = signers[0];
    addr1 = signers[1];
    addr2 = signers[2];

    Moloch = await ethers.getContractFactory("Moloch");
    MolochSummoner = await ethers.getContractFactory("MolochSummoner");
    Daogroni = await ethers.getContractFactory("Daogroni");
    Wrapper = await ethers.getContractFactory("Wrapper");

    moloch = (await Moloch.deploy()) as Moloch;

    wrapper = (await Wrapper.deploy()) as Wrapper;

    molochSummoner = (await MolochSummoner.deploy(
      moloch.address
    )) as MolochSummoner;

    /* Summon new dao 
      Summoner will have one share
      */
    const sum = await molochSummoner.summonMoloch(
      owner.address,
      owner.address,
      [wrapper.address],
      60,
      1,
      1,
      0,
      3,
      0
    );
    const idx = await molochSummoner.daoIdx();
    const newMoloch = await molochSummoner.daos(idx);

    /* Summon new UH dao 
      Summoner will have one share
      */
    const sum2 = await molochSummoner.summonMoloch(
      owner.address,
      owner.address,
      [wrapper.address],
      60,
      1,
      1,
      0,
      3,
      0
    );
    const idx2 = await molochSummoner.daoIdx();
    const newUhMoloch = await molochSummoner.daos(idx2);

    daogroni = (await Daogroni.deploy(newMoloch,
      wrapper.address)) as Daogroni;


    // daogroniContract = (await Daogroni.attach(daogroni)) as Daogroni;
    molochContract = (await Moloch.attach(newMoloch)) as Moloch;
    molochUhContract = (await Moloch.attach(newUhMoloch)) as Moloch;
  });
  describe("Deployment", function () {
    it("Should add multiple summoners", async function () {
      /* Summoner can make a function call to set more summoners and to set the shaman
      this currently could be run multiple times if the summoner does not set a shaman the first time
       */
      const multiSummon = await molochContract.setSharesLoot(
        [owner.address, addr1.address, addr2.address],
        ["9", "10", "10"],
        ["0", "11", "0"],
        true
      );
      let mem = await molochContract.members(owner.address);
      expect(mem.shares.toString()).to.equal("9");
      let mem2 = await molochContract.members(addr1.address);
      expect(mem2.shares.toString()).to.equal("10");
      expect(mem2.loot.toString()).to.equal("11");
    });

    it("should be able to add daogroni shaman", async function () {
      /*
        set daogroni as shaman
       */
      console.log("wrapper", await daogroni.wrapper());
      
      const setShaman = await molochContract.setShaman(
        daogroni.address,
        true
      );
    });

  });
  describe("Daogroni tests", function () {
    beforeEach(async function () {
      /*
        set daogroni as shaman
       */
      const setShaman = await molochContract.setShaman(
        daogroni.address,
        true
      );
    });

    it("should mint", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      const orderDrink = await daogroni.orderDrink(
        owner.address,
        4,
        {
          value: ethers.utils.parseEther(".3")
      }
      );

      console.log(await daogroni.tokenURI(1))


    });

    it("should mint and redeem", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  
      console.log('shaman', await molochContract.shamans(daogroni.address))
  
      /* Send funds to the yeeter which will update the loot
       */
      let params = {
        to: daogroni.address,
        value: ethers.utils.parseUnits("9.1", "ether").toHexString(),
      };
      params = {
        to: daogroni.address,
        value: ethers.utils.parseUnits("1.1", "ether").toHexString(),
      };
  
      const orderDrink = await daogroni.orderDrink(
        owner.address,
        4,
        {
          value: ethers.utils.parseEther(".3")
      }
      );
      const orderDrink2 = await daogroni.orderDrink(
        owner.address,
        4,
        {
          value: ethers.utils.parseEther(".3")
      }
      );
      const orderDrink3 = await daogroni.orderDrink(
        owner.address,
        4,
        {
          value: ethers.utils.parseEther(".3")
      }
      );
      const orderDrink4 = await daogroni.orderDrink(
        owner.address,
        4,
        {
          value: ethers.utils.parseEther(".3")
      }
      );
      const orderDrink5 = await daogroni.orderDrink(
        owner.address,
        4,
        {
          value: ethers.utils.parseEther(".3")
      }
      );
      const orderDrink6 = await daogroni.orderDrink(
        owner.address,
        4,
        {
          value: ethers.utils.parseEther(".3")
      }
      );
      console.log("1:", await daogroni.tokenURI(1))
      console.log("2:",await daogroni.tokenURI(2))
      console.log("3:",await daogroni.tokenURI(3))
      console.log("4:",await daogroni.tokenURI(4))
      console.log("5:",await daogroni.tokenURI(5))
      console.log("6:",await daogroni.tokenURI(6))


  
      const redeem = await daogroni.redeem(1);
  
      console.log(await daogroni.tokenURI(1))
  
  
    });
    
  });


  
});
