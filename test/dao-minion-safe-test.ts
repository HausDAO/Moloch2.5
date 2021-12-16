import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { use, expect } from "chai";
import { randomBytes } from 'crypto'

import { ContractFactory } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Moloch } from "../src/types/Moloch";
import { Yeeter } from "../src/types/Yeeter";
import { MolochSummoner } from "../src/types/MolochSummoner";
import { DaoSafeMinionSummoner } from "../src/types/DaoSafeMinionSummoner";
import { YeetSummoner } from "../src/types/YeetSummoner";
import { Wrapper } from "../src/types/Wrapper";
import { SafeMinionSummoner } from "../src/types/SafeMinionSummoner";
import { GnosisSafe } from "../src/types/GnosisSafe";
import { GnosisSafeProxy } from "../src/types/GnosisSafeProxy";
import { MultiSend } from "../src/types/MultiSend";
import { SignMessageLib } from "../src/types/SignMessageLib";
import { CompatibilityFallbackHandler } from "../src/types/CompatibilityFallbackHandler";
import { SafeMinion } from "../src/types/SafeMinion";
import { AnyErc20 } from "../src/types/AnyErc20";

const generateNonce = async () => {
  const buffer = await randomBytes(32)
  return buffer.toString('hex')
}

use(solidity);

describe.only("Moloch Yeeter Summoner", function () {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let Moloch: ContractFactory;
  let Yeeter: ContractFactory;

  let YeetSummoner: ContractFactory;
  let Wrapper: ContractFactory;
  let SafeMinionSummoner: ContractFactory;
  let safeMinionSummoner: SafeMinionSummoner;
  let yeetSummoner: YeetSummoner;
  let moloch: Moloch;
  let yeeter: Yeeter;
  let wrapper: Wrapper;
  let yeetContractexpiered: Yeeter;

  let MolochSummoner: ContractFactory;
  let molochSummoner: MolochSummoner;

  let DaoSafeMinionSummoner: ContractFactory;
  let daoSafeMinionSummoner: DaoSafeMinionSummoner;

  let GnosisSafe: ContractFactory;
  let gnosisSafeSingleton: GnosisSafe;
  let gnosisSafe: GnosisSafe;

  let GnosisSafeProxy: ContractFactory;
  let gnosisSafeProxy: GnosisSafeProxy;

  let MultiSend: ContractFactory;
  let multisend: MultiSend;

  let yeetContract: Yeeter;
  let molochContract: Moloch;
  let molochUhContract: Moloch;

  let SignMessageLib: ContractFactory;
  let signMessageLib: SignMessageLib;

  let CompatibilityFallbackHandler: ContractFactory;
  let handler: CompatibilityFallbackHandler;

  let SafeMinion: ContractFactory;
  let safeMinion: SafeMinion;
  let safeMinionTemplate: SafeMinion;

  let AnyERC20: ContractFactory
  let anyErc20: AnyErc20

  beforeEach(async function () {
    signers = await ethers.getSigners();
    owner = signers[0];
    addr1 = signers[1];
    addr2 = signers[2];

    Moloch = await ethers.getContractFactory("Moloch");
    MolochSummoner = await ethers.getContractFactory("MolochSummoner");

    DaoSafeMinionSummoner = await ethers.getContractFactory(
      "DaoSafeMinionSummoner"
    );

    Yeeter = await ethers.getContractFactory("Yeeter");
    YeetSummoner = await ethers.getContractFactory("YeetSummoner");
    Wrapper = await ethers.getContractFactory("Wrapper");
    MultiSend = await ethers.getContractFactory("MultiSend");
    SignMessageLib = await ethers.getContractFactory("SignMessageLib");
    GnosisSafe = await ethers.getContractFactory('GnosisSafe')
    GnosisSafeProxy = await ethers.getContractFactory('GnosisSafeProxy')
    CompatibilityFallbackHandler = await ethers.getContractFactory('CompatibilityFallbackHandler')
    SafeMinion = await ethers.getContractFactory('SafeMinion')
    SafeMinionSummoner = await ethers.getContractFactory('SafeMinionSummoner')
    AnyERC20 = await ethers.getContractFactory('AnyERC20')

    yeeter = (await Yeeter.deploy()) as Yeeter;
    moloch = (await Moloch.deploy()) as Moloch;

    yeetSummoner = (await YeetSummoner.deploy(yeeter.address)) as YeetSummoner;
    wrapper = (await Wrapper.deploy()) as Wrapper;

    molochSummoner = (await MolochSummoner.deploy(
      moloch.address
    )) as MolochSummoner;

    gnosisSafeSingleton = (await GnosisSafe.deploy()) as GnosisSafe;
    multisend = (await MultiSend.deploy()) as MultiSend;
    signMessageLib = (await SignMessageLib.deploy()) as SignMessageLib;
    handler =
      (await CompatibilityFallbackHandler.deploy()) as CompatibilityFallbackHandler;
    safeMinionTemplate = (await SafeMinion.deploy()) as SafeMinion;
  

    safeMinionSummoner = (await SafeMinionSummoner.deploy(
      safeMinionTemplate.address,
      gnosisSafeSingleton.address,
      handler.address,
      multisend.address
    )) as SafeMinionSummoner;

    // console.log(safeMinionSummoner);
    
    daoSafeMinionSummoner = (await DaoSafeMinionSummoner.deploy(
      safeMinionSummoner.address,
      molochSummoner.address
    )) as DaoSafeMinionSummoner;
    
  });
  describe("Deployment", function () {
    it("Should deploy a new minion, safe and dao", async function () {
      const salt = await generateNonce()
      anyErc20 = (await AnyERC20.deploy()) as AnyErc20
      
      await daoSafeMinionSummoner.summonDaoMinionAndSafe("0x" + salt, 300, 1, 1, [anyErc20.address], "test")

      // expect shaman to be factory

    });
    it("should set up the dao with multiple summoners and a shaman", async function () {
      const salt = await generateNonce()
      anyErc20 = (await AnyERC20.deploy()) as AnyErc20
      
      await daoSafeMinionSummoner.summonDaoMinionAndSafe("0x" + salt, 300, 1, 1, [anyErc20.address], "test")
      const idx = await daoSafeMinionSummoner.daoIdx();
      // const dsm = await daoSafeMinionSummoner.daos(idx);
      
      // set up moloch with multiple share/loot holders and add the minion shaman 
      await daoSafeMinionSummoner.setUpDaoMinionAndSafe(idx, [addr1.address, addr2.address],[1,2],[3,4]);

      // expect addr 1 and 2 to have shares and loot now and shaman is minion
    });
    it("should initialize only once", async function () {
      const salt = await generateNonce()
      anyErc20 = (await AnyERC20.deploy()) as AnyErc20
      
      await daoSafeMinionSummoner.summonDaoMinionAndSafe("0x" + salt, 300, 1, 1, [anyErc20.address], "test")
      const idx = await daoSafeMinionSummoner.daoIdx();
      
      // set up moloch with multiple share/loot holders and add the minion shaman 
      await daoSafeMinionSummoner.setUpDaoMinionAndSafe(idx, [addr1.address, addr2.address],[1,2],[3,4]);

      const resetup = daoSafeMinionSummoner.setUpDaoMinionAndSafe(idx, [addr1.address, addr2.address],[10,20],[3,4]);
      
      await expect(resetup).to.be.revertedWith("already initialized");

    });
    it("should only work for the summoner", async function () {
      const salt = await generateNonce()
      anyErc20 = (await AnyERC20.deploy()) as AnyErc20
      
      await daoSafeMinionSummoner.summonDaoMinionAndSafe("0x" + salt, 300, 1, 1, [anyErc20.address], "test")
      const idx = await daoSafeMinionSummoner.daoIdx();
      const summonerAsAddr1 = await daoSafeMinionSummoner.connect(addr1);
      

      const resetup = summonerAsAddr1.setUpDaoMinionAndSafe(idx, [addr1.address, addr2.address],[10,20],[3,4]);
      
      await expect(resetup).to.be.revertedWith("!summoner");
    });
  });
});
