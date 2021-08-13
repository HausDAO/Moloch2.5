import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { BigNumberish, Contract, ContractFactory } from "ethers";
import { use, expect } from "chai";
import { AnyErc20 } from "../src/types/AnyErc20";
import { Moloch } from "../src/types/Moloch";
import { DaoConditionalHelper } from "../src/types/DaoConditionalHelper";
import { WhitelistModuleHelper } from "../src/types/WhitelistModuleHelper";
import { NeapolitanMinion } from "../src/types/NeapolitanMinion";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { doProposal, fastForwardBlocks } from "./util";

use(solidity);

describe("Delete Action", function () {
  let Moloch: ContractFactory;
  let moloch: Moloch;
  let moloch2: Moloch;
  let DaoConditionalHelper: ContractFactory;
  let helper: DaoConditionalHelper;
  let WhitelistModuleHelper: ContractFactory;
  let moduleHelper: WhitelistModuleHelper;


  let molochAsAlice: Moloch;

  let NeapolitanMinion: ContractFactory;
  let neapolitanMinion: NeapolitanMinion;

  let neapolitanMinionAsAlice: NeapolitanMinion;
  let moduleHelperAsAlice: WhitelistModuleHelper;
  let moduleHelperAsBob: WhitelistModuleHelper;

  let AnyNft: ContractFactory;

  let AnyERC20: ContractFactory;
  let anyErc20: AnyErc20;

  let signers: SignerWithAddress[];

  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  const zeroAddress = "0x0000000000000000000000000000000000000000";
  let totalAccountingAddress: string;
  let guildAccountingAddress: string;

  let deployerAddress: string;
  let aliceAddress: string;
  let bobAddress: string;

  let minQuorum: BigNumberish;

  this.beforeAll(async function () {
    Moloch = await ethers.getContractFactory("Moloch");
    DaoConditionalHelper = await ethers.getContractFactory("DaoConditionalHelper");
    NeapolitanMinion = await ethers.getContractFactory("NeapolitanMinion");
    WhitelistModuleHelper = await ethers.getContractFactory("WhitelistModuleHelper");
    AnyNft = await ethers.getContractFactory("AnyNFT");
    AnyERC20 = await ethers.getContractFactory("AnyERC20");
    signers = await ethers.getSigners();
    deployer = signers[0];
    alice = signers[1];
    bob = signers[2];

    deployerAddress = deployer.address;
    aliceAddress = alice.address;
    bobAddress = bob.address;
  });

  describe("Minions", function () {
    this.beforeEach(async function () {
      // Deploy ERC20 contract
      anyErc20 = (await AnyERC20.deploy()) as AnyErc20;

      // deploy Moloch and Minion
      moloch = (await Moloch.deploy()) as Moloch;
      moloch2 = (await Moloch.deploy()) as Moloch;
      helper = (await DaoConditionalHelper.deploy()) as DaoConditionalHelper;
      molochAsAlice = await moloch.connect(alice);
      // 5 block periods, 5 period voting, 1 period grace, 0 proposal deposit, 3 dilution bound, 0 reward, 100 summoner shares, 50 alice shares
      await moloch.init(
        [deployerAddress, aliceAddress, bobAddress],
        [anyErc20.address],
        5,
        5,
        1,
        0,
        3,
        0,
        [100, 50, 10]
      );
      await moloch2.init(
        [deployerAddress, aliceAddress, bobAddress],
        [anyErc20.address],
        5,
        5,
        1,
        0,
        3,
        0,
        [100, 50, 10]
      );

      // Mint ERC20 to moloch
      await anyErc20.mint(moloch.address, 10000);

      // collect tokens
      await moloch.collectTokens(anyErc20.address);
      minQuorum = 20;
      neapolitanMinion = (await NeapolitanMinion.deploy()) as NeapolitanMinion;
      await neapolitanMinion.init(moloch.address, minQuorum);
      neapolitanMinionAsAlice = await neapolitanMinion.connect(alice);

      moduleHelper = (await WhitelistModuleHelper
        .deploy([aliceAddress],neapolitanMinion.address)) as WhitelistModuleHelper;
      moduleHelperAsAlice = await moduleHelper.connect(alice);
      moduleHelperAsBob = await moduleHelper.connect(bob);

      // send some erc20 to minion
      await anyErc20.mint(neapolitanMinion.address, 500);

      totalAccountingAddress = await moloch.TOTAL();
      guildAccountingAddress = await moloch.GUILD();

      await fastForwardBlocks(5);
    });

    it("Sets up the tests", async function () {
      expect(await anyErc20.balanceOf(moloch.address)).to.equal(10000);
      expect(await anyErc20.balanceOf(neapolitanMinion.address)).to.equal(500);
      expect(await moloch.totalGuildBankTokens()).to.equal(1);
      expect(
        await moloch.userTokenBalances(guildAccountingAddress, anyErc20.address)
      ).to.equal(10000);
      expect(
        await moloch.userTokenBalances(totalAccountingAddress, anyErc20.address)
      ).to.equal(10000);
      expect((await moloch.members(aliceAddress)).shares).to.equal(50);
      expect((await moloch.members(deployerAddress)).shares).to.equal(100);
    });

    describe("Delete Action", function () {
      it("Enables an action to be deleted via a proposal", async function () {
        const action_1 = anyErc20.interface.encodeFunctionData("transfer", [
          aliceAddress,
          10,
        ]);
        const delete_action_1 = neapolitanMinion.interface.encodeFunctionData("deleteAction", [0])

        await neapolitanMinion.proposeAction(
          [anyErc20.address],
          [0],
          [action_1],
          anyErc20.address,
          0,
          "test",
          false
        );

        await doProposal(true, 0, moloch)
        
        // now delete the action
        await neapolitanMinion.proposeAction(
          [neapolitanMinion.address],
          [0],
          [delete_action_1],
          // [action_1],
          anyErc20.address,
          0,
          "test",
          false
        );

        await doProposal(true, 1, moloch)

        await neapolitanMinion.executeAction(
          1,
          [neapolitanMinion.address],
          [0],
          [delete_action_1]
        );

        expect(neapolitanMinion.executeAction(0, [anyErc20.address], [0], [action_1])).to.be.revertedWith('Minion::action was deleted')

      });

      it("Does not let anyone else call delete action", async function () {
        const action_1 = anyErc20.interface.encodeFunctionData("transfer", [
          aliceAddress,
          10,
        ]);

        await neapolitanMinion.proposeAction(
          [anyErc20.address],
          [0],
          [action_1],
          anyErc20.address,
          0,
          "test",
          false
        );

        await doProposal(true, 0, moloch)
        
        expect(neapolitanMinion.deleteAction(0)).to.be.revertedWith('Minion::can only be called by this')

      });

      
    });
    
    describe('Edge cases', function() {
      it("Allows a proposal to delete itself", async function() {
        const delete_action_0 = neapolitanMinion.interface.encodeFunctionData("deleteAction", [0])

        
        // now delete the action
        await neapolitanMinion.proposeAction(
          [neapolitanMinion.address],
          [0],
          [delete_action_0],
          // [action_1],
          anyErc20.address,
          0,
          "test",
          false
        );
        expect((await neapolitanMinion.actions(0)).proposer).to.equal(deployerAddress)
        await doProposal(true, 0, moloch)


        await neapolitanMinion.executeAction(
          0,
          [neapolitanMinion.address],
          [0],
          [delete_action_0]
        );
      expect((await neapolitanMinion.actions(0)).proposer).to.equal(zeroAddress)
        

      expect(neapolitanMinion.executeAction(0, [anyErc20.address], [0], [delete_action_0])).to.be.revertedWith('Minion::action was deleted')

      })
    })
  });
});
