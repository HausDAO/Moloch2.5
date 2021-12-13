const { expect } = require("chai");
const { ethers } = require("hardhat");

let owner;
let addr1;
let addr2;
let addrs;

let yeeter;
let wrapper;
let moloch;
let molochSummoner;
let yeetSummoner;
let Moloch;
let Yeeter;

let yeetContract;
let molochContract;
let molochUhContract;

describe("Moloch Summoner", function () {
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    Moloch = await hre.ethers.getContractFactory("Moloch");
    const MolochSummoner = await hre.ethers.getContractFactory(
      "MolochSummoner"
    );
    Yeeter = await hre.ethers.getContractFactory("Yeeter");
    const YeetSummoner = await hre.ethers.getContractFactory("YeetSummoner");
    const Wrapper = await hre.ethers.getContractFactory("Wrapper");

    yeeter = await Yeeter.deploy();
    await yeeter.deployed();

    yeetSummoner = await YeetSummoner.deploy(yeeter.address);
    await yeetSummoner.deployed();

    wrapper = await Wrapper.deploy();
    await wrapper.deployed();

    moloch = await Moloch.deploy();
    await moloch.deployed();

    molochSummoner = await MolochSummoner.deploy(moloch.address);
    await molochSummoner.deployed();

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
      newUhMoloch,
      wrapper.address,
      ethers.utils.parseUnits("100", "ether"),
      "1622898000000", //
      "0",
      "10",
      ethers.utils.parseUnits("1", "ether")
    );

    const yeetIdx = await yeetSummoner.yeetIdx();
    const newYeet = await yeetSummoner.yeeters(yeetIdx);

    yeetContract = await Yeeter.attach(newYeet);
    molochContract = await Moloch.attach(newMoloch);
    molochUhContract = await Moloch.attach(newUhMoloch);
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
      expect(mem.shares.toString()).to.equal("10");
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
    it("should take deposits for loot", async function () {
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
      const stx1 = await owner.sendTransaction(params);
      const summonerDeposit = await yeetContract.deposits(owner.address);
      // unitPrice is 1 so should have returned the .1 and 9 should be left
      expect(summonerDeposit.toString()).to.equal(
        ethers.utils.parseUnits("10", "ether")
      );
    });
  });
  describe("Yeeter config", function () {
    it("it should have different yeeter configs", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      const yeet = await yeetSummoner.summonYeet(
        molochContract.address,
        molochUhContract.address,
        wrapper.address,
        ethers.utils.parseUnits("100", "ether"),
        "1622898000", // in the past
        "0",
        "10",
        ethers.utils.parseUnits("1", "ether")
      );

      const yeetIdx = await yeetSummoner.yeetIdx();
      const newYeet = await yeetSummoner.yeeters(yeetIdx);

      yeetContractexpiered = await Yeeter.attach(newYeet);

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
