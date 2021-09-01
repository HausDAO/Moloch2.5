import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { randomBytes } from 'crypto'
import { Contract, ContractFactory, BigNumberish, Wallet } from 'ethers'
import { use, expect } from 'chai'
import { AnyErc20 } from '../src/types/AnyErc20'
import { Moloch } from '../src/types/Moloch'
import { DaoConditionalHelper } from '../src/types/DaoConditionalHelper'
import { SafeMinion } from '../src/types/SafeMinion'
import { SafeMinionSummoner } from '../src/types/SafeMinionSummoner'
// import { TestExecutor } from '../src/types/TestExecutor'
import { GnosisSafe } from '../src/types/GnosisSafe'
import { GnosisSafeProxy } from '../src/types/GnosisSafeProxy'
import { CompatibilityFallbackHandler } from '../src/types/CompatibilityFallbackHandler'
import { MultiSend } from '../src/types/MultiSend'
import { SignMessageLib } from '../src/types/SignMessageLib'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { doProposal, encodeMultiAction, fastForwardBlocks } from './util'
import { encodeMultiSend, executeContractCallWithSigners, MetaTransaction } from '@gnosis.pm/safe-contracts'

const generateNonce = async () => {
  const buffer = await randomBytes(32)
  return buffer.toString('hex')
}

use(solidity)

describe.only('Safe Minion Functionality', function () {
  let Moloch: ContractFactory
  let moloch: Moloch

  let MultiSend: ContractFactory
  let multisend: MultiSend

  let SignMessageLib: ContractFactory
  let signMessageLib: SignMessageLib

  let CompatibilityFallbackHandler: ContractFactory
  let handler: CompatibilityFallbackHandler

  let molochAsAlice: Moloch

  let SafeMinion: ContractFactory
  let safeMinion: SafeMinion
  let safeMinionTemplate: SafeMinion

  let SafeMinionSummoner: ContractFactory
  let safeMinionSummoner: SafeMinionSummoner

  let GnosisSafe: ContractFactory
  let gnosisSafeSingleton: GnosisSafe
  let gnosisSafe: GnosisSafe

  let GnosisSafeProxy: ContractFactory
  let gnosisSafeProxy: GnosisSafeProxy

  let DaoConditionalHelper: ContractFactory
  let helper: DaoConditionalHelper

  let AnyNft: ContractFactory

  let AnyERC20: ContractFactory
  let anyErc20: AnyErc20

  let signers: SignerWithAddress[]

  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress

  let deployerAddress: string
  let aliceAddress: string
  let bobAddress: string

  let arbitraryMsgHash: string
  let magicValue: string

  let testWallet: Wallet

  const demoKey = '0xc41d4ecec0049da2bc18ad0538dffedd2af76714a0438229dbd55e1109f0493d'
  const testWalletAbstract = new ethers.Wallet(demoKey)

  const zeroAddress = '0x0000000000000000000000000000000000000000'

  let minQuorum: BigNumberish

  this.beforeAll(async function () {
    Moloch = await ethers.getContractFactory('Moloch')
    DaoConditionalHelper = await ethers.getContractFactory('DaoConditionalHelper')
    SafeMinion = await ethers.getContractFactory('SafeMinion')
    SafeMinionSummoner = await ethers.getContractFactory('SafeMinionSummoner')
    AnyNft = await ethers.getContractFactory('AnyNFT')
    GnosisSafe = await ethers.getContractFactory('GnosisSafe')
    GnosisSafeProxy = await ethers.getContractFactory('GnosisSafeProxy')
    MultiSend = await ethers.getContractFactory('MultiSend')
    SignMessageLib = await ethers.getContractFactory('SignMessageLib')
    CompatibilityFallbackHandler = await ethers.getContractFactory('CompatibilityFallbackHandler')
    AnyERC20 = await ethers.getContractFactory('AnyERC20')
    signers = await ethers.getSigners()
    deployer = signers[0]
    alice = signers[1]
    bob = signers[2]

    deployerAddress = deployer.address
    aliceAddress = alice.address
    bobAddress = bob.address
    arbitraryMsgHash = await ethers.utils.hashMessage('This does not have to be the same')
    magicValue = '0x1626ba7e'

    // Deploy gnosis singleton
    gnosisSafeSingleton = (await GnosisSafe.deploy()) as GnosisSafe
    multisend = (await MultiSend.deploy()) as MultiSend
    signMessageLib = (await SignMessageLib.deploy()) as SignMessageLib
    handler = (await CompatibilityFallbackHandler.deploy()) as CompatibilityFallbackHandler
    safeMinionTemplate = (await SafeMinion.deploy()) as SafeMinion
    const molochTemplate = await Moloch.deploy()

    safeMinionSummoner = (await SafeMinionSummoner.deploy(
      safeMinionTemplate.address,
      molochTemplate.address,
      gnosisSafeSingleton.address,
      handler.address,
      multisend.address
    )) as SafeMinionSummoner

    testWallet = await testWalletAbstract.connect(ethers.provider)
  })

  describe('Helpers', function () {
    it('fast forwards blocks', async function () {
      const blockNumber = await ethers.provider.getBlockNumber()
      await fastForwardBlocks(5)
      expect(await ethers.provider.getBlockNumber()).to.equal(blockNumber + 5)
    })
  })
  describe('Minions', function () {
    this.beforeEach(async function () {
      // Deploy ERC20 contract
      anyErc20 = (await AnyERC20.deploy()) as AnyErc20

      // deploy Moloch and Minion
      moloch = (await Moloch.deploy()) as Moloch
      helper = (await DaoConditionalHelper.deploy()) as DaoConditionalHelper
      molochAsAlice = await moloch.connect(alice)
      // 5 block periods, 5 period voting, 1 period grace, 0 proposal deposit, 3 dilution bound, 0 reward, 100 summoner shares, 50 alice shares
      await moloch.init([deployerAddress, aliceAddress], [anyErc20.address], 5, 5, 1, 0, 3, 0, [100, 50])

      // Mint ERC20 to moloch
      await anyErc20.mint(moloch.address, 10000)

      // collect tokens
      await moloch.collectTokens(anyErc20.address)

      minQuorum = 20
      
      const salt = await generateNonce()

      await safeMinionSummoner.summonMinionAndSafe(moloch.address, '', minQuorum, "0x" + salt)
      const newMinionCount = (await safeMinionSummoner.minionCount()).toNumber()
      const newMinionAddress = await safeMinionSummoner.minionList(newMinionCount - 1)
      safeMinion = (await SafeMinion.attach(newMinionAddress)) as SafeMinion
      const gnosisSafeAddress = await safeMinion.avatar()
      await anyErc20.mint(gnosisSafeAddress, 500)
      gnosisSafe = (await GnosisSafe.attach(gnosisSafeAddress)) as GnosisSafe
    })

    it('Sets up the tests', async function () {
      const threshold = await gnosisSafe.getThreshold()
      console.log({ safeMinion: safeMinion.address, gnosisSafe: gnosisSafe.address })
      console.log({ threshold })
      expect(await moloch.totalGuildBankTokens()).to.equal(1)
      expect((await moloch.members(aliceAddress)).shares).to.equal(50)
      expect((await moloch.members(deployerAddress)).shares).to.equal(100)
      expect(await gnosisSafe.isOwner(safeMinion.address)).to.equal(true)
      // expect(await gnosisSafe.isModuleEnabled(deployerAddress)).to.equal(false)
      // expect(await gnosisSafe.isModuleEnabled(safeMinion.address)).to.equal(true)
    })
    describe('Signatures', function () {
      it('Allows a member to submit a signature proposal and mark it valid through voting', async function () {
        const sign_action_1 = signMessageLib.interface.encodeFunctionData('signMessage', [arbitraryMsgHash])
        const multi_action = encodeMultiAction(multisend, [sign_action_1], [signMessageLib.address], [1])
        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)

        await doProposal(true, 0, moloch)

        await safeMinion.executeAction(0, multi_action)

        const validator = await handler.attach(gnosisSafe.address)
        expect(await validator.callStatic['isValidSignature(bytes32,bytes)'](arbitraryMsgHash, '0x')).to.equal(magicValue)
      })

      it('Fails if proposal has not passed', async function () {
        const sign_action_1 = signMessageLib.interface.encodeFunctionData('signMessage', [arbitraryMsgHash])
        const multi_action = encodeMultiAction(multisend, [sign_action_1], [signMessageLib.address], [1])
        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)

        const validator = await handler.attach(gnosisSafe.address)
        expect(validator.callStatic['isValidSignature(bytes32,bytes)'](arbitraryMsgHash, '0x')).to.be.revertedWith('Hash not approved')
      })
    })

    describe('Safe management', function () {
      it('Enables multiple modules to be activated on setup', async function () {
        const proxy = await GnosisSafeProxy.deploy(gnosisSafeSingleton.address)
        gnosisSafe = (await GnosisSafe.attach(proxy.address)) as GnosisSafe
        await safeMinionSummoner.summonMinion(moloch.address, gnosisSafe.address, '', minQuorum, 100)
        const newMinionCount = (await safeMinionSummoner.minionCount()).toNumber()
        const newMinionAddress = await safeMinionSummoner.minionList(newMinionCount - 1)
        safeMinion = (await SafeMinion.attach(newMinionAddress)) as SafeMinion

        expect(await gnosisSafe.isModuleEnabled(safeMinion.address)).to.equal(false)
        expect(await gnosisSafe.isModuleEnabled(deployerAddress)).to.equal(false)

        const enableModuleAction_1 = gnosisSafe.interface.encodeFunctionData('enableModule', [safeMinion.address])
        const enableModuleAction_2 = gnosisSafe.interface.encodeFunctionData('enableModule', [deployerAddress])
        const multi_action = encodeMultiAction(
          multisend,
          [enableModuleAction_1, enableModuleAction_2],
          [gnosisSafe.address, gnosisSafe.address],
          [0, 0]
        )
        await gnosisSafe.setup([testWallet.address], 1, multisend.address, multi_action, zeroAddress, zeroAddress, 0, zeroAddress)
        expect(await gnosisSafe.isModuleEnabled(safeMinion.address)).to.equal(true)
        expect(await gnosisSafe.isModuleEnabled(deployerAddress)).to.equal(true)
      })
      it('Enables a minion to add another module', async function () {
        expect(await gnosisSafe.isModuleEnabled(deployerAddress)).to.equal(false)
        const action_1 = gnosisSafe.interface.encodeFunctionData('enableModule', [deployerAddress])
        const multi_action = encodeMultiAction(multisend, [action_1], [gnosisSafe.address], [0])
        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)
        await doProposal(true, 0, moloch)

        await safeMinion.executeAction(0, multi_action)
        expect(await gnosisSafe.isModuleEnabled(deployerAddress)).to.equal(true)
      })

      it('Enables a minion to add an owner', async function () {
        expect(await gnosisSafe.isOwner(deployerAddress)).to.equal(false)
        const action_1 = gnosisSafe.interface.encodeFunctionData('addOwnerWithThreshold', [deployerAddress, 1])
        const multi_action = encodeMultiAction(multisend, [action_1], [gnosisSafe.address], [0])
        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)
        await doProposal(true, 0, moloch)

        await safeMinion.executeAction(0, multi_action)
        expect(await gnosisSafe.isOwner(deployerAddress)).to.equal(true)
      })
    })

    describe('Safe withdraw from Moloch', function () {
      it('Enables a Minion to withdraw Moloch funds into a safe', async function () {
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(gnosisSafe.address)).to.equal(500)
        const action_1 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])

        const multi_action = encodeMultiAction(multisend, [action_1], [anyErc20.address], [0])
        await safeMinion.proposeAction(multi_action, anyErc20.address, 100, 'test', false)

        await doProposal(true, 0, moloch)

        await safeMinion.doWithdraw(anyErc20.address, 100)
        expect(await anyErc20.balanceOf(gnosisSafe.address)).to.equal(600)
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)

        await safeMinion.executeAction(0, multi_action)

        expect(await anyErc20.balanceOf(gnosisSafe.address)).to.equal(590)
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(10)
      })
    })
    describe('Multisend', function () {
      it('Enables 2 actions to be associated with one proposal', async function () {
        const action_1 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        const action_2 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 20])

        const multi_action = encodeMultiAction(multisend, [action_1, action_2], [anyErc20.address, anyErc20.address], [0, 0])

        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)

        await doProposal(true, 0, moloch)

        await safeMinion.executeAction(0, multi_action)

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(30)
        expect(await anyErc20.balanceOf(gnosisSafe.address)).to.equal(470)
      })

      it('Enables a proposal to delete a previous action', async function () {
        const action_1 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        const delete_action_1 = safeMinion.interface.encodeFunctionData('deleteAction', [0])

        const multi_action_1 = encodeMultiAction(multisend, [action_1], [anyErc20.address], [0])
        const delete_multi_action_1 = encodeMultiAction(multisend, [delete_action_1], [safeMinion.address], [0])

        await safeMinion.proposeAction(multi_action_1, anyErc20.address, 0, 'test', false)

        await doProposal(true, 0, moloch)

        await safeMinion.proposeAction(delete_multi_action_1, anyErc20.address, 0, 'test', false)

        await doProposal(true, 1, moloch)

        await safeMinion.executeAction(1, delete_multi_action_1)
        expect(safeMinion.executeAction(0, multi_action_1)).to.be.revertedWith('Minion::action was deleted')
      })

      it('Enables actions to be executed early when minQuorum is met', async function () {
        const action_1 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        const action_2 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 20])

        const multi_action = encodeMultiAction(multisend, [action_1, action_2], [anyErc20.address, anyErc20.address], [0, 0])

        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(5)

        // execute before proposal is processed

        await safeMinion.executeAction(0, multi_action)

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(30)
        expect(await anyErc20.balanceOf(gnosisSafe.address)).to.equal(470)
      })

      it('Fail actions when executed early and minQuorum is not met', async function () {
        const action_1 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        const action_2 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 20])

        const multi_action = encodeMultiAction(multisend, [action_1, action_2], [anyErc20.address, anyErc20.address], [0, 0])

        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        // do not vote on proposal

        // execute before proposal is processed

        expect(safeMinion.executeAction(0, multi_action)).to.be.revertedWith('Minion::proposal execution requirements not met')
      })

      it('It withdraws tokens from treasury when part of the proposal', async function () {
        const action_1 = anyErc20.interface.encodeFunctionData('approve', [aliceAddress, 10])
        const multi_action = encodeMultiAction(multisend, [action_1], [anyErc20.address], [0])

        // withdraw 10 anytoken on execute
        await safeMinion.proposeAction(multi_action, anyErc20.address, 10, 'test', false)

        await doProposal(true, 0, moloch)
        expect(await anyErc20.balanceOf(gnosisSafe.address)).to.equal(500)
        await safeMinion.executeAction(0, multi_action)
        expect(await anyErc20.balanceOf(gnosisSafe.address)).to.equal(510)
      })

      it('Fails if an executed action is different from a proposed action', async function () {
        const action_1 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        const action_2 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 20])

        const multi_action = encodeMultiAction(multisend, [action_1, action_2], [anyErc20.address, anyErc20.address], [0, 0])

        const invalid_action = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 30])

        const invalid_multi_action = encodeMultiAction(multisend, [action_1, invalid_action], [anyErc20.address, anyErc20.address], [0, 0])

        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)

        await doProposal(true, 0, moloch)

        expect(safeMinion.executeAction(0, invalid_multi_action)).to.be.revertedWith('Minion::not a valid operation')
      })

      it('Fails when first actions condition is not meet', async function () {
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const action_1 = helper.interface.encodeFunctionData('isAfter', [
          Math.floor(tomorrow.getTime() / 1000), // tomorrows data, remove ms
        ])
        const action_2 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 20])

        const multi_action = encodeMultiAction(multisend, [action_1, action_2], [helper.address, anyErc20.address], [0, 0])

        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)

        await doProposal(true, 0, moloch)

        expect(safeMinion.executeAction(0, multi_action)).to.be.revertedWith('Minion::call failure')
      })

      it('Passes when first actions condition is meet', async function () {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const action_1 = helper.interface.encodeFunctionData('isAfter', [
          Math.floor(yesterday.getTime() / 1000), // yesterdays date
        ])
        const action_2 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 20])

        const multi_action = encodeMultiAction(multisend, [action_1, action_2], [helper.address, anyErc20.address], [0, 0])

        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)

        await doProposal(true, 0, moloch)

        await safeMinion.executeAction(0, multi_action)

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(20)
      })

      it('Enables Buyout proposal type condition', async function () {
        const action_1 = helper.interface.encodeFunctionData('isNotDaoMember', [aliceAddress, moloch.address])
        const action_2 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 20])

        const multi_action = encodeMultiAction(multisend, [action_1, action_2], [helper.address, anyErc20.address], [0, 0])

        await safeMinion.proposeAction(multi_action, anyErc20.address, 0, 'test', false)

        await doProposal(true, 0, moloch)

        // should fail before ragequit
        expect(safeMinion.executeAction(0, multi_action)).to.be.revertedWith('Minion::call failure')

        await molochAsAlice.ragequit(50, 0)
        // now it should complete successfully
        await safeMinion.executeAction(0, multi_action)

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(20)
      })
    })
  })
})
