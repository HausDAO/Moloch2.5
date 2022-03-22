import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { use, expect } from "chai";
import { ContractFactory } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Moloch } from "../src/types/Moloch";
import { Yeeter } from "../src/types/Yeeter";
import { MolochSummoner } from "../src/types/MolochSummoner";
import { YeetSummoner } from "../src/types/YeetSummoner";
import { Wrapper } from "../src/types/Wrapper";

use(solidity);

describe("Moloch Yeeter Summoner", function () {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let Moloch: ContractFactory;
  let Yeeter: ContractFactory;
  let MolochSummoner: ContractFactory;
  let YeetSummoner: ContractFactory;
  let Wrapper: ContractFactory;
  let molochSummoner: MolochSummoner;
  let yeetSummoner: YeetSummoner;
  let moloch: Moloch;
  let yeeter: Yeeter;
  let wrapper: Wrapper;
  let yeetContractexpiered: Yeeter;

  let yeetContract: Yeeter;
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
    Yeeter = await ethers.getContractFactory("Yeeter");
    YeetSummoner = await ethers.getContractFactory("YeetSummoner");
    Wrapper = await ethers.getContractFactory("Wrapper");

    yeeter = (await Yeeter.deploy()) as Yeeter;
    moloch = (await Moloch.deploy()) as Moloch;

    yeetSummoner = (await YeetSummoner.deploy(yeeter.address)) as YeetSummoner;
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

    /* Deploy and configure the shaman(yeeter)
      max target is 100 eth
      10 units per addr
       */
    const yeet = await yeetSummoner.summonYeet(
      newMoloch,
      wrapper.address,
      ethers.utils.parseUnits("100", "ether"),
      "1622898000000", //
      "0",
      "10",
      ethers.utils.parseUnits("1", "ether"),
      "test",
      false
    );

    const yeetIdx = await yeetSummoner.yeetIdx();
    const newYeet = await yeetSummoner.yeeters(yeetIdx);

    yeetContract = (await Yeeter.attach(newYeet)) as Yeeter;
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
    it("should not be able to add multple members after a proposal", async function () {
      "TODO";
    });
    it("should be able to add a yeeter shaman", async function () {
      /*
        set yeeter as shaman
       */
      const setShaman = await molochContract.setShaman(
        yeetContract.address,
        true
      );
    });
    it("should be able to disable a shaman", async function () {
      /*
  set yeeter as shaman
 */
      const setShaman = await molochContract.setShaman(owner.address, false);
      const unsetShaman = molochContract.setShaman(owner.address, true);
      expect(unsetShaman).to.be.revertedWith("!shaman");
    });
  });
  describe("Yeeter tests", function () {
    beforeEach(async function () {
      /*
        set yeeter as shaman
       */
      const setShaman = await molochContract.setShaman(
        yeetContract.address,
        true
      );
    });
    it("should take deposits", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      /* Send funds to the yeeter which will update the loot
       */
      let params = {
        to: yeetContract.address,
        value: ethers.utils.parseUnits("9.1", "ether").toHexString(),
      };
      const stx = await owner.sendTransaction(params);
      params = {
        to: yeetContract.address,
        value: ethers.utils.parseUnits("1.1", "ether").toHexString(),
      };
      // const stx1 = await owner.sendTransaction(params);

      await expect(owner.sendTransaction(params))
        .to.emit(yeetContract, "YeetReceived")
        .withArgs(
          owner.address,
          ethers.utils.parseUnits("1", "ether").toString(),
          molochContract.address,
          100,
          3
        );

      // console.log('stx1....', stx1)
      const summonerDeposit = await yeetContract.deposits(owner.address);
      const lootper = await yeetContract.lootPerUnit();
      console.log("loot per", lootper.toString());

      // unitPrice is 1 so should have returned the .1 and 9 should be left
      expect(summonerDeposit.toString()).to.equal(
        ethers.utils.parseUnits("10", "ether")
      );
    });
    it("should take deposits for loot in the dao", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      /* Send funds to the yeeter which will update the loot
       */
      let params = {
        to: yeetContract.address,
        value: ethers.utils.parseUnits("9.1", "ether").toHexString(),
      };
      const stx = await addr1.sendTransaction(params);
      params = {
        to: yeetContract.address,
        value: ethers.utils.parseUnits("1.1", "ether").toHexString(),
      };
      const stx1 = await addr1.sendTransaction(params);
      const summonerDeposit = await yeetContract.deposits(addr1.address);
      const member = await molochContract.members(addr1.address);
      const factoryOwnerMember = await molochContract.members(owner.address);
      // 900 + 100
      expect(member.loot.toString()).to.equal("1000");
      expect(factoryOwnerMember.loot.toString()).to.equal("30");
    });
  });
  describe("Yeeter config", function () {
    it("it should have different yeeter configs", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      const yeet = await yeetSummoner.summonYeet(
        molochContract.address,
        wrapper.address,
        ethers.utils.parseUnits("100", "ether"),
        "1622898000", // in the past
        "0",
        "10",
        ethers.utils.parseUnits("1", "ether"),
        "test",
        false
      );

      const yeetIdx = await yeetSummoner.yeetIdx();
      const newYeet = await yeetSummoner.yeeters(yeetIdx);

      yeetContractexpiered = (await Yeeter.attach(newYeet)) as Yeeter;

      const setShaman = await molochContract.setShaman(
        yeetContractexpiered.address,
        true
      );
      /* Send funds to the yeeter which will update the loot
       */
      let params = {
        to: yeetContractexpiered.address,
        value: ethers.utils.parseUnits("9.1", "ether").toHexString(),
      };
      const stx = owner.sendTransaction(params);
      expect(stx).to.be.revertedWith("Time is up");
    });
  });
});
