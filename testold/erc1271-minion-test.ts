import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory, BigNumberish } from 'ethers'
import { use, expect } from 'chai'
import { AnyErc20 } from '../src/types/AnyErc20'
import { Moloch } from '../src/types/Moloch'
import { NeapolitanMinion } from '../src/types/NeapolitanMinion'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { doProposal, fastForwardBlocks } from './util'

use(solidity)

describe('ERC1271 Minion Functionality', function () {
  let Moloch: ContractFactory
  let moloch: Moloch
  
  let molochAsAlice: Moloch
  
  let ERC1271Minion: ContractFactory
  let erc1271Minion: NeapolitanMinion

  let erc1271MinionAsAlice: NeapolitanMinion
  let erc1271MinionAsBob: NeapolitanMinion

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

  let arbitarySignature: string
  let arbitrarySignatureHash: string
  let arbitraryMsgHash: string
  let magicValue: string

  let minQuorum: BigNumberish;

  this.beforeAll(async function () {
    Moloch = await ethers.getContractFactory('Moloch')
    ERC1271Minion = await ethers.getContractFactory('NeapolitanMinion')
    AnyNft = await ethers.getContractFactory('AnyNFT')
    AnyERC20 = await ethers.getContractFactory('AnyERC20')
    signers = await ethers.getSigners()
    deployer = signers[0]
    alice = signers[1]
    bob = signers[2]

    deployerAddress = deployer.address
    aliceAddress = alice.address
    bobAddress = bob.address
    arbitarySignature = await alice.signMessage('This can be anything')
    arbitrarySignatureHash = ethers.utils.solidityKeccak256(['bytes'],[arbitarySignature])
    arbitraryMsgHash = await ethers.utils.hashMessage('This does not have to be the same')
    magicValue = '0x1626ba7e'
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
      molochAsAlice = await moloch.connect(alice)
      // 5 block periods, 5 period voting, 1 period grace, 0 proposal deposit, 3 dilution bound, 0 reward, 100 summoner shares, 50 alice shares
      await moloch.init([deployerAddress, aliceAddress], [anyErc20.address], 5, 5, 1, 0, 3, 0, [100, 50])

      // Mint ERC20 to moloch
      await anyErc20.mint(moloch.address, 10000)
      
      // collect tokens
      await moloch.collectTokens(anyErc20.address)

      erc1271Minion = (await ERC1271Minion.deploy()) as NeapolitanMinion
      minQuorum = 20;
      await erc1271Minion.init(moloch.address, minQuorum)
      erc1271MinionAsAlice = await erc1271Minion.connect(alice)
      erc1271MinionAsBob = await erc1271Minion.connect(bob)
      
      await fastForwardBlocks(5)
      
    })
    
    it('Sets up the tests', async function () {
      expect(await moloch.totalGuildBankTokens()).to.equal(1)
      expect((await moloch.members(aliceAddress)).shares).to.equal(50)
      expect((await moloch.members(deployerAddress)).shares).to.equal(100)
    })
    
    describe('Signatures', function () {
      it('Allows a member to submit a signature proposal and mark it valid through voting', async function () {
        const sign_action_1 = erc1271Minion.interface.encodeFunctionData("sign", [
          arbitraryMsgHash,
          arbitrarySignatureHash,
          magicValue
        ]);
        await erc1271Minion.proposeAction(
          [erc1271Minion.address],
          [0],
          [sign_action_1],
          anyErc20.address,
          0,
          "test",
          false
        )
        
        await doProposal(true, 0, moloch)
        
        await erc1271Minion.executeAction(0, [erc1271Minion.address], [0], [sign_action_1])
        
        expect(await erc1271Minion.isValidSignature(arbitraryMsgHash, arbitarySignature)).to.equal(magicValue)
        
      })

      it('Reverts if proposal has not passed yet', async function () {
        const sign_action_1 = erc1271Minion.interface.encodeFunctionData("sign", [
          arbitraryMsgHash,
          arbitrarySignatureHash,
          magicValue
        ]);
        await erc1271Minion.proposeAction(
          [erc1271Minion.address],
          [0],
          [sign_action_1],
          anyErc20.address,
          0,
          "test",
          false
        )
        
        expect(erc1271Minion.isValidSignature(arbitraryMsgHash, arbitarySignature)).to.be.revertedWith('erc1271::invalid signature')
      })

      it('Does not allow anyone else to call sign', async function () {
        expect(erc1271Minion.sign(arbitraryMsgHash, arbitrarySignatureHash, magicValue)).to.be.revertedWith('Minion::can only be called by this')
      })

      it('Reverts if proposal has been cancelled', async function () {
        const sign_action_1 = erc1271Minion.interface.encodeFunctionData("sign", [
          arbitraryMsgHash,
          arbitrarySignatureHash,
          magicValue
        ]);
        await erc1271Minion.proposeAction(
          [erc1271Minion.address],
          [0],
          [sign_action_1],
          anyErc20.address,
          0,
          "test",
          false
        )
        
        await fastForwardBlocks(1)
        await erc1271Minion.cancelAction(0)

        expect(erc1271Minion.isValidSignature(arbitraryMsgHash, arbitarySignature)).to.be.revertedWith('erc1271::invalid signature')
      })
      
      it('Does not allow someone else to cancel signature proposal', async function () {
        const sign_action_1 = erc1271Minion.interface.encodeFunctionData("sign", [
          arbitraryMsgHash,
          arbitrarySignatureHash,
          magicValue
        ]);
        await erc1271Minion.proposeAction(
          [erc1271Minion.address],
          [0],
          [sign_action_1],
          anyErc20.address,
          0,
          "test",
          false
        )
        
        await fastForwardBlocks(1)
        expect(erc1271MinionAsAlice.cancelAction(0)).to.be.revertedWith('not proposer')
      })
      
      // reverts if failed
      it('Reverts if proposal has failed', async function () {
        const sign_action_1 = erc1271Minion.interface.encodeFunctionData("sign", [
          arbitraryMsgHash,
          arbitrarySignatureHash,
          magicValue
        ]);
        await erc1271Minion.proposeAction(
          [erc1271Minion.address],
          [0],
          [sign_action_1],
          anyErc20.address,
          0,
          "test",
          false
        )
        
        await doProposal(false, 0, moloch)
        expect(erc1271Minion.executeAction(0, [erc1271Minion.address], [0], [sign_action_1])).to.be.revertedWith('Minion::proposal execution requirements not met')

        expect(erc1271Minion.isValidSignature(arbitraryMsgHash, arbitarySignature)).to.be.revertedWith('erc1271::invalid signature')
      })

      // reverts if wrong signature

      it('Reverts if wrongs signature given for valid proposal', async function () {
        const sign_action_1 = erc1271Minion.interface.encodeFunctionData("sign", [
          arbitraryMsgHash,
          arbitrarySignatureHash,
          magicValue
        ]);
        await erc1271Minion.proposeAction(
          [erc1271Minion.address],
          [0],
          [sign_action_1],
          anyErc20.address,
          0,
          "test",
          false
        )
        
        await doProposal(true, 0, moloch)

        const invalidSignature = await alice.signMessage('something else')
        
        expect(erc1271Minion.isValidSignature(arbitraryMsgHash, invalidSignature)).to.be.revertedWith('erc1271::invalid signature')
      })


    })


  })
})

