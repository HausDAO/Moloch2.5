import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { use, expect } from 'chai'
import { AnyNft } from '../src/types/AnyNft'
import { AnyErc20 } from '../src/types/AnyErc20'
import { Moloch } from '../src/types/Moloch'
import { EscrowMinion } from '../src/types/EscrowMinion'
import { VanillaMinion } from '../src/types/VanillaMinion'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { fastForwardBlocks } from './util'

use(solidity)

describe('Escrow', function () {
  let Moloch: ContractFactory
  let moloch: Moloch
  
  let EscrowMinion: ContractFactory
  let escrowMinion: EscrowMinion

  let VanillaMinion: ContractFactory
  let vanillaMinion: VanillaMinion

  let escrowMinionAsAlice: EscrowMinion

  let AnyNft: ContractFactory
  let anyNft: AnyNft

  let AnyERC20: ContractFactory
  let anyErc20: AnyErc20

  let anyNftAsAlice: AnyNft
  let anyNftAsBob: AnyNft

  let signers: SignerWithAddress[]

  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress

  let minterAddress: string

  const zeroAddress = '0x0000000000000000000000000000000000000000'

  let deployerAddress: string
  let aliceAddress: string
  let bobAddress: string

  this.beforeAll(async function () {
    Moloch = await ethers.getContractFactory('Moloch')
    EscrowMinion = await ethers.getContractFactory('EscrowMinion')
    AnyNft = await ethers.getContractFactory('AnyNFT')
    AnyERC20 = await ethers.getContractFactory('AnyERC20')
    VanillaMinion = await ethers.getContractFactory('VanillaMinion')
    signers = await ethers.getSigners()
    deployer = signers[0]
    alice = signers[1]
    bob = signers[2]

    deployerAddress = deployer.address
    aliceAddress = alice.address
    bobAddress = bob.address
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
      // Deploy NFT contract and mint NFT to alice
      anyNft = (await AnyNft.deploy()) as AnyNft
      await anyNft.mintItem(aliceAddress, 'test')
      anyNftAsAlice = await anyNft.connect(alice)
      
      // Deploy ERC20 contract
      anyErc20 = (await AnyERC20.deploy()) as AnyErc20

      escrowMinion = (await EscrowMinion.deploy()) as EscrowMinion
      escrowMinionAsAlice = await escrowMinion.connect(alice)
      
      // deploy Moloch and Minion
      moloch = (await Moloch.deploy()) as Moloch
      await moloch.init([deployerAddress], [anyErc20.address], 5, 5, 1, 0, 3, 0, [1])

      vanillaMinion = (await VanillaMinion.deploy()) as VanillaMinion
      await vanillaMinion.init(moloch.address)
      
    })
    
    it('Sets up the tests', async function () {
      expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
    })

    describe('EscrowMinion', function () {
      it('Can send NFTs to vanilla minion', async function () {
        await anyNftAsAlice.transferFrom(aliceAddress, vanillaMinion.address, 1)
        expect(await anyNft.ownerOf(1)).to.equal(vanillaMinion.address)

      })
      it('Moves NFT into minion during proposal', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(aliceAddress, moloch.address, anyNft.address, 1, vanillaMinion.address, 5, 'test')
        
        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)

      })

      it('Moves NFT into vault if proposal passes', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(aliceAddress, moloch.address, anyNft.address, 1, vanillaMinion.address, 5, 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.executeAction(0, moloch.address)

        expect(await anyNft.ownerOf(1)).to.equal(vanillaMinion.address)

      })

      it('Increases the shares of the applicant', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(aliceAddress, moloch.address, anyNft.address, 1, vanillaMinion.address, 5, 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)

        await escrowMinionAsAlice.executeAction(0, moloch.address)
        await fastForwardBlocks(1)

        expect(await anyNft.ownerOf(1)).to.equal(vanillaMinion.address)
        expect((await moloch.members(aliceAddress)).shares).to.equal(5)

      })

      it('Returns NFT to applicant if proposal fails', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(aliceAddress, moloch.address, anyNft.address, 1, vanillaMinion.address, 5, 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 2)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.executeAction(0, moloch.address)

        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)

      })

      it('Fails to execute if proposal has not been processed', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(aliceAddress, moloch.address, anyNft.address, 1, vanillaMinion.address, 5, 'test')

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        expect(escrowMinionAsAlice.executeAction(0, moloch.address)).to.be.revertedWith('proposal not processed')
      })

      it('Returns NFT to applicant if proposal is cancelled', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(aliceAddress, moloch.address, anyNft.address, 1, vanillaMinion.address, 5, 'test')
        
        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
      })

      it('Cannot cancel after sponsoring', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(aliceAddress, moloch.address, anyNft.address, 1, vanillaMinion.address, 5, 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        expect(escrowMinionAsAlice.cancelAction(0, moloch.address)).to.be.revertedWith('proposal has already been sponsored')
      })
      
    })



  })
})

