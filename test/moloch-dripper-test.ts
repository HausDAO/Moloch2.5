import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { use, expect } from 'chai'
import { ContractFactory } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Moloch } from "../src/types/Moloch";
import { Dripper } from "../src/types/Dripper";
import { MolochSummoner } from "../src/types/MolochSummoner";
import { DripSummoner } from "../src/types/DripSummoner";
import { Wrapper } from "../src/types/Wrapper";
import { AnyErc20 } from '../src/types/AnyErc20';
import { fastForwardTime } from './util';

use(solidity)

describe.only("Moloch Dripper Summoner", function () {

let signers: SignerWithAddress[]
let owner: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;

let Moloch: ContractFactory;
let Dripper: ContractFactory;
let MolochSummoner: ContractFactory;
let DripSummoner: ContractFactory;

let AnyERC20: ContractFactory
let anyErc20: AnyErc20
let molochSummoner: MolochSummoner;
let dripSummoner: DripSummoner;
let moloch: Moloch;
let dripper: Dripper;


let dripContract: Dripper;
let molochContract: Moloch;

  beforeEach(async function () {

    signers = await ethers.getSigners()
    owner = signers[0]
    addr1 = signers[1]
    addr2 = signers[2]

    Moloch = await ethers.getContractFactory("Moloch");
    MolochSummoner = await ethers.getContractFactory(
      "MolochSummoner"
    );
    Dripper = await ethers.getContractFactory("Dripper");
    DripSummoner = await ethers.getContractFactory("DripSummoner");

    dripper = (await Dripper.deploy()) as Dripper;
    moloch = (await Moloch.deploy()) as Moloch;

    dripSummoner = (await DripSummoner.deploy(dripper.address) ) as DripSummoner;

    molochSummoner = (await MolochSummoner.deploy(moloch.address)) as MolochSummoner;
    AnyERC20 = await ethers.getContractFactory("AnyERC20");
    anyErc20 = (await AnyERC20.deploy()) as AnyErc20;

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

    /* Deploy and configure the shaman(Dripper)
      max target is 100 eth
      10 units per addr
       */
    const drip = await dripSummoner.summonDrip(
      newMoloch,
      Math.floor(Date.now()/1000) + 3600,
      Math.floor(Date.now()/1000) - 3600,
      120,
      true,
      123,
      "test"
    );

    const dripIdx = await dripSummoner.dripIdx();
    const newDrip = await dripSummoner.drippers(dripIdx);

    dripContract = (await Dripper.attach(newDrip)) as Dripper;
    molochContract = (await Moloch.attach(newMoloch)) as Moloch;
    
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
    it("should be able to add a Dripper shaman", async function () {
      /*
        set Dripper as shaman
       */
      const setShaman = await molochContract.setShaman(
        dripContract.address,
        true
      );
    });
    it("should be able to disable a shaman", async function () {
      /*
  set Dripper as shaman
 */
      const setShaman = await molochContract.setShaman(owner.address, false);
      const unsetShaman = molochContract.setShaman(owner.address, true);
      expect(unsetShaman).to.be.revertedWith("!shaman");

    });
  });
  describe("Dripper tests", function () {
    beforeEach(async function () {
      /*
        set Dripper as shaman
       */
      const setShaman = await molochContract.setShaman(
        dripContract.address,
        true
      );
    });
    it("should claim drip", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      const getDrip = await dripContract.claim();
      let mem = await molochContract.members(owner.address);
      expect(mem.shares.toString()).to.equal("123");
      fastForwardTime(600);
      await dripContract.claim();
      mem = await molochContract.members(owner.address);
      expect(mem.shares.toString()).to.equal("246");

      const getDripfail = dripContract.claim();
      expect(getDripfail).to.be.revertedWith("already claimed");
      console.log('member shares', mem.shares.toString());
      
    });
    it("should take deposits for loot in the dao", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    });
  });
  describe("Dripper config", function () {
    it("it should have different dripper configs", async function () {
      const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      
    });
  });
});
