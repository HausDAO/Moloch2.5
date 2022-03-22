import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { use, expect } from "chai";
import { ContractFactory } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Moloch } from "../src/types/Moloch";
import { Yeeter } from "../src/types/Yeeter";
import { MolochSummoner } from "../src/types/MolochSummoner";
import { HarbergerNft } from "../src/types/HarbergerNft";
import { Wrapper } from "../src/types/Wrapper";
import { AnyErc20 } from "../src/types/AnyErc20";
import { BigNumber } from "ethers";

use(solidity);

const fastForwardTime = async (seconds: number) => {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
};

const fastForwardBlocks = async (blocks: number) => {
  for (let index = 0; index < blocks; index++) {
    await ethers.provider.send("evm_mine", []);
  }
};

describe("Moloch Harberger Summoner", function () {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let Moloch: ContractFactory;
  let HarbergerNft: ContractFactory;
  let MolochSummoner: ContractFactory;
  let AnyErc20: ContractFactory;
  let molochSummoner: MolochSummoner;
  let moloch: Moloch;
  let harbergerNft: HarbergerNft;

  let anyErc20: AnyErc20;

  let harbergerNftContract: HarbergerNft;
  let molochContract: Moloch;

  const zeroAddr = "0x0000000000000000000000000000000000000000";
  const initSupply = "1000000000000000000000000";

  beforeEach(async function () {
    signers = await ethers.getSigners();
    owner = signers[0];
    addr1 = signers[1];
    addr2 = signers[2];

    Moloch = await ethers.getContractFactory("Moloch");
    MolochSummoner = await ethers.getContractFactory("MolochSummoner");
    HarbergerNft = await ethers.getContractFactory("HarbergerNft");
    AnyErc20 = await ethers.getContractFactory("AnyERC20");

    moloch = (await Moloch.deploy()) as Moloch;

    anyErc20 = (await AnyErc20.deploy()) as AnyErc20;
    await anyErc20.mint(owner.address, initSupply);
    await anyErc20.mint(addr1.address, initSupply);
    await anyErc20.mint(addr2.address, initSupply);

    molochSummoner = (await MolochSummoner.deploy(
      moloch.address
    )) as MolochSummoner;

    /* Summon new dao 
      Summoner will have one share
      */
    const sum = await molochSummoner.summonMoloch(
      owner.address,
      owner.address,
      [anyErc20.address],
      60,
      1,
      1,
      0,
      3,
      0
    );
    const idx = await molochSummoner.daoIdx();
    const newMoloch = await molochSummoner.daos(idx);
    molochContract = (await Moloch.attach(newMoloch)) as Moloch;

    harbergerNft = (await HarbergerNft.deploy(
      molochContract.address,
      anyErc20.address,
      60,
      2
    )) as HarbergerNft;
    harbergerNftContract = (await HarbergerNft.attach(
      harbergerNft.address
    )) as HarbergerNft;
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
    it("should not be able to add multple members after a proposal", async function () {
      "TODO";
    });
    it("should be able to add a harberger shaman", async function () {
      /*
        set harbergerNft as shaman
       */
      const setShaman = await molochContract.setShaman(
        harbergerNft.address,
        true
      );
    });
    it("should be able to disable a shaman", async function () {
      /*
  set address as shaman
 */
      const setShaman = await molochContract.setShaman(owner.address, false);
      const unsetShaman = molochContract.setShaman(owner.address, true);
      expect(unsetShaman).to.be.revertedWith("!shaman");
    });
  });
  describe.only("harbergerNft tests", function () {
    beforeEach(async function () {
      /*
        set harbergerNft as shaman
       */
      const setShaman = await molochContract.setShaman(
        harbergerNft.address,
        true
      );
      // transfer owner
      await anyErc20.transferOwnership(addr1.address);
      const newOwner = await anyErc20.owner();
      console.log(newOwner.toString());
    });
    it("should be able to discover", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      const discoveryFee = await harbergerNft.discoveryFee();
      const discoverAsAddr1 = await harbergerNft.connect(addr1);
      const tokenAsAddr1 = await anyErc20.connect(addr1);

      const approval = await tokenAsAddr1.approve(
        harbergerNft.address,
        discoveryFee.mul(3)
      );
      const discover = await discoverAsAddr1.discover(
        addr1.address,
        [1, 2, 3],
        discoveryFee.mul(3)
      );
      const ownerOf = await harbergerNft.ownerOf(2);
      const tokenbalance = await tokenAsAddr1.balanceOf(addr1.address);
      console.log("owner, ownerOf", owner.address, ownerOf.toString());
      console.log("owner, balance", tokenbalance.toString());
      expect(addr1.address).to.equal(ownerOf.toString());
      expect(tokenbalance).to.equal(
        ethers.BigNumber.from(initSupply).sub(discoveryFee.mul(3))
      );
    });
    it("should not be able to collect infirst period", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      const discoveryFee = await harbergerNft.discoveryFee();
      const discoverAsAddr1 = await harbergerNft.connect(addr1);
      const tokenAsAddr1 = await anyErc20.connect(addr1);
      const periodLength = await harbergerNft.periodLength();

      const approval = await tokenAsAddr1.approve(
        harbergerNft.address,
        discoveryFee.mul(3)
      );
      const discover = await discoverAsAddr1.discover(
        addr1.address,
        [1, 2, 3],
        discoveryFee.mul(3)
      );

      const collect = harbergerNft.collect([1]);
      await expect(collect).to.be.revertedWith("period0");
    });
    it("should not be able to collect on new land", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      const discoveryFee = await harbergerNft.discoveryFee();
      const discoverAsAddr1 = await harbergerNft.connect(addr1);
      const tokenAsAddr1 = await anyErc20.connect(addr1);
      const periodLength = await harbergerNft.periodLength();

      await fastForwardTime(parseInt(periodLength.toString()) * 1);

      const approval = await tokenAsAddr1.approve(
        harbergerNft.address,
        discoveryFee.mul(3)
      );
      const discover = await discoverAsAddr1.discover(
        addr1.address,
        [1, 2, 3],
        discoveryFee.mul(3)
      );

      const collect = harbergerNft.collect([1]);
      await expect(collect).to.be.revertedWith("coolDown");
    });
    it("should not be able to reclaim in cooldown", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      const discoveryFee = await harbergerNft.discoveryFee();
      const discoverAsAddr1 = await harbergerNft.connect(addr1);
      const tokenAsAddr1 = await anyErc20.connect(addr1);
      const periodLength = await harbergerNft.periodLength();

      await fastForwardTime(parseInt(periodLength.toString()) * 1);

      const approval = await tokenAsAddr1.approve(
        harbergerNft.address,
        discoveryFee.mul(3)
      );
      const discover = await discoverAsAddr1.discover(
        addr1.address,
        [1, 2, 3],
        discoveryFee.mul(3)
      );
      // await fastForwardTime(parseInt(periodLength.toString()))

      const reclaimAsAddr2 = await harbergerNft.connect(addr2);
      const tokenAsAddr2 = await anyErc20.connect(addr2);

      const approval2 = await tokenAsAddr2.approve(
        harbergerNft.address,
        discoveryFee
      );
      const reclaim = reclaimAsAddr2.reclaim(addr2.address, [1], discoveryFee);

      await expect(reclaim).to.be.revertedWith("coolDown");
    });
    it("should be able to reclaim", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      const discoveryFee = await harbergerNft.discoveryFee();
      const discoverAsAddr1 = await harbergerNft.connect(addr1);
      const tokenAsAddr1 = await anyErc20.connect(addr1);
      const periodLength = await harbergerNft.periodLength();

      await fastForwardTime(parseInt(periodLength.toString()) * 3);

      const approval = await tokenAsAddr1.approve(
        harbergerNft.address,
        discoveryFee.mul(3)
      );
      const discover = await discoverAsAddr1.discover(
        addr1.address,
        [1, 2, 3],
        discoveryFee.mul(3)
      );
      await fastForwardTime(parseInt(periodLength.toString()) * 6);

      const ownerOfBefore = await harbergerNft.ownerOf(1);

      expect(ownerOfBefore).to.equal(addr1.address);
      console.log("ownerOfBefore", ownerOfBefore);
      console.log(
        "current period",
        (await harbergerNft.getCurrentPeriod()).toString()
      );
      console.log("cool down", (await harbergerNft.coolDown()).toString());
      console.log(
        "plot foreclosePeriod",
        (await harbergerNft.plots(1)).foreclosePeriod.toString()
      );

      const reclaimAsAddr2 = await harbergerNft.connect(addr2);
      const tokenAsAddr2 = await anyErc20.connect(addr2);

      const approval2 = await tokenAsAddr2.approve(
        harbergerNft.address,
        discoveryFee
      );
      const reclaim = await reclaimAsAddr2.reclaim(
        addr2.address,
        [1],
        discoveryFee
      );

      const ownerOfAfter = await harbergerNft.ownerOf(1);

      expect(ownerOfAfter).to.equal(addr2.address);
    });
    it("should be able to deposit for fee only and buy with 0 price", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      const discoveryFee = await harbergerNft.discoveryFee();
      const depositFee = await harbergerNft.depositFee();
      const harAsAddr1 = await harbergerNft.connect(addr1);
      const harAsAddr2 = await harbergerNft.connect(addr2);
      const tokenAsAddr1 = await anyErc20.connect(addr1);
      const tokenAsAddr2 = await anyErc20.connect(addr2);
      const periodLength = await harbergerNft.periodLength();
      const depositPeriods = 3;

      const approval = await tokenAsAddr1.approve(
        harbergerNft.address,
        discoveryFee.mul(depositPeriods).add(depositFee.mul(depositPeriods))
      );
      const discover = await harAsAddr1.discover(
        addr1.address,
        [1, 2, 3],
        discoveryFee.mul(depositPeriods)
      );
      await fastForwardTime(parseInt(periodLength.toString()) * 11);

      console.log(
        "current period",
        (await harbergerNft.getCurrentPeriod()).toString()
      );
      console.log("cool down", (await harbergerNft.coolDown()).toString());
      console.log(
        "plot foreclosePeriod",
        (await harbergerNft.plots(1)).foreclosePeriod.toString()
      );
      const deposit = await harAsAddr1.deposit(
        [1],
        depositPeriods,
        depositFee.mul(depositPeriods)
      );

      await fastForwardTime(parseInt(periodLength.toString()));
      const balance = await tokenAsAddr2.balanceOf(harbergerNft.address);
      console.log('balance**************', balance.toString());
      
      const approval2 = await tokenAsAddr2.approve(
        harbergerNft.address,
        discoveryFee.mul(2)
      );
      const buy = await harAsAddr2.buy(addr2.address,1,discoveryFee.mul(2))
      const ownerOfAfter = await harbergerNft.ownerOf(1);

      expect(ownerOfAfter).to.equal(addr2.address);

    });
    it("should be able to set a price", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      const discoveryFee = await harbergerNft.discoveryFee();
      const discoverAsAddr1 = await harbergerNft.connect(addr1);
      const tokenAsAddr1 = await anyErc20.connect(addr1);
      const periodLength = await harbergerNft.periodLength();

      await fastForwardTime(parseInt(periodLength.toString()) * 3);

      const approval = await tokenAsAddr1.approve(
        harbergerNft.address,
        discoveryFee.mul(3)
      );
      const discover = await discoverAsAddr1.discover(
        addr1.address,
        [1, 2, 3],
        discoveryFee.mul(3)
      );

      discoverAsAddr1.setPrice(1, "1000000000000000");

      const newPrice = (await harbergerNft.plots(1)).price.toString();
      expect(newPrice).to.equal("1000000000000000");
    });
    it("should be able to deposit for fee and tax only and buy with price > 0", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      const discoveryFee = await harbergerNft.discoveryFee();
      const depositFee = await harbergerNft.depositFee();
      const harAsAddr1 = await harbergerNft.connect(addr1);
      const harAsAddr2 = await harbergerNft.connect(addr2);
      const tokenAsAddr1 = await anyErc20.connect(addr1);
      const tokenAsAddr2 = await anyErc20.connect(addr2);
      const periodLength = await harbergerNft.periodLength();
      const depositPeriods = 3;

      const approval = await tokenAsAddr1.approve(
        harbergerNft.address,
        discoveryFee.mul(depositPeriods).add(depositFee.mul(depositPeriods))
      );
      const discover = await harAsAddr1.discover(
        addr1.address,
        [1, 2, 3],
        discoveryFee.mul(depositPeriods)
      );
      await fastForwardTime(parseInt(periodLength.toString()) * 11);
      const setPrice = await harAsAddr1.setPrice(1, "1000000000000000");
      console.log(
        "current period",
        (await harbergerNft.getCurrentPeriod()).toString()
      );
      console.log("cool down", (await harbergerNft.coolDown()).toString());
      console.log(
        "plot foreclosePeriod",
        (await harbergerNft.plots(1)).foreclosePeriod.toString()
      );
      const newPrice = (await harbergerNft.plots(1)).price.toString();
      const amountByPeriod = (await harbergerNft.getAmountByPeriod(depositPeriods, newPrice)).toString();
      await tokenAsAddr1.approve(
        harbergerNft.address,
        depositFee.mul(depositPeriods).add(amountByPeriod)
      );
      

      const deposit = await harAsAddr1.deposit(
        [1],
        depositPeriods,
        depositFee.mul(depositPeriods).add(amountByPeriod)
      );

      await fastForwardTime(parseInt(periodLength.toString()));
      const balance = await tokenAsAddr2.balanceOf(harbergerNft.address);
      console.log('balance**************', balance.toString());
      
      const approval2 = await tokenAsAddr2.approve(
        harbergerNft.address,
        discoveryFee.mul(2).add(newPrice)
      );
      const buy = await harAsAddr2.buy(addr2.address,1,discoveryFee.mul(2).add(newPrice))
      const ownerOfAfter = await harbergerNft.ownerOf(1);

      expect(ownerOfAfter).to.equal(addr2.address);

    });

  });
  describe("harnerger config", function () {
    it("it should have different harberger configs", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    });
  });
});
