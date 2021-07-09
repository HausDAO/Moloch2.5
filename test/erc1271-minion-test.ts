import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { use, expect } from 'chai'
import { AnyErc20 } from '../src/types/AnyErc20'
import { Moloch } from '../src/types/Moloch'
import { Erc1271Minion } from '../src/types/Erc1271Minion'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { fastForwardBlocks } from './util'

use(solidity)

describe('ERC1271 Minion', function () {
  let Moloch: ContractFactory
  let moloch: Moloch
  
  let molochAsAlice: Moloch
  
  let ERC1271Minion: ContractFactory
  let erc1271Minion: Erc1271Minion

  let erc1271MinionAsAlice: Erc1271Minion
  let erc1271MinionAsBob: Erc1271Minion

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

  this.beforeAll(async function () {
    Moloch = await ethers.getContractFactory('Moloch')
    ERC1271Minion = await ethers.getContractFactory('ERC1271Minion')
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

      erc1271Minion = (await ERC1271Minion.deploy()) as Erc1271Minion
      await erc1271Minion.init(moloch.address)
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
      it('Allows a member to submit a signature proposal', async function () {
        await erc1271Minion.proposeSignature(arbitraryMsgHash, arbitrarySignatureHash, magicValue, 'sig test')
        
        expect((await erc1271Minion.signatures(arbitraryMsgHash)).magicValue).to.equal(magicValue)
        
      })

      it('Marks a signature valid if a proposal passes', async function () {
        await erc1271Minion.proposeSignature(arbitraryMsgHash, arbitrarySignatureHash, magicValue, 'sig test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 1)
        
        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        expect(await erc1271Minion.isValidSignature(arbitraryMsgHash, arbitarySignature)).to.equal(magicValue)
      })

      it('Reverts if proposal has not passed yet', async function () {
        await erc1271Minion.proposeSignature(arbitraryMsgHash, arbitrarySignatureHash, magicValue, 'sig test')
        
        expect(erc1271Minion.isValidSignature(arbitraryMsgHash, arbitarySignature)).to.be.revertedWith('Proposal has not passed')
      })

      it('Reverts if proposal has been cancelled', async function () {
        await erc1271Minion.proposeSignature(arbitraryMsgHash, arbitrarySignatureHash, magicValue, 'sig test')
        
        await fastForwardBlocks(1)
        await erc1271Minion.cancelSignature(arbitraryMsgHash)

        expect(erc1271Minion.isValidSignature(arbitraryMsgHash, arbitarySignature)).to.be.revertedWith('Proposal has not passed')
      })
      
      it('Does not allow someone else to cancel signature proposal', async function () {
        await erc1271Minion.proposeSignature(arbitraryMsgHash, arbitrarySignatureHash, magicValue, 'sig test')
        
        await fastForwardBlocks(1)
        expect(erc1271MinionAsAlice.cancelSignature(arbitraryMsgHash)).to.be.revertedWith('not proposer')
      })
      
      // reverts if failed
      it('Reverts if proposal has failed', async function () {
        await erc1271Minion.proposeSignature(arbitraryMsgHash, arbitrarySignatureHash, magicValue, 'sig test')

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 2)
        
        await fastForwardBlocks(31)
        
        expect(erc1271Minion.isValidSignature(arbitraryMsgHash, arbitarySignature)).to.be.revertedWith('Proposal has not passed')
      })

      it('Reverts if proposal has failed and processed', async function () {
        await erc1271Minion.proposeSignature(arbitraryMsgHash, arbitrarySignatureHash, magicValue, 'sig test')

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 2)
        
        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        expect(erc1271Minion.isValidSignature(arbitraryMsgHash, arbitarySignature)).to.be.revertedWith('Proposal has not passed')
      })
      
      // reverts if wrong signature

      it('Reverts if wrongs signature given for valid proposal', async function () {
        await erc1271Minion.proposeSignature(arbitraryMsgHash, arbitrarySignatureHash, magicValue, 'sig test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 1)
        
        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        const invalidSignature = await alice.signMessage('something else')
        
        expect(erc1271Minion.isValidSignature(arbitraryMsgHash, invalidSignature)).to.be.revertedWith('Invalid signature hash')
      })


    })


  })
})

