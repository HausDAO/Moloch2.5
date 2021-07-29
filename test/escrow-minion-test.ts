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
  let anyOtherErc20: AnyErc20

  let anyErc20AsAlice: AnyErc20
  let anyOtherErc20AsAlice: AnyErc20

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
  
  const numTokens = 10

  const tokenIds = Array.from({length: numTokens}, (_, i) => i + 1)

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
      anyNftAsAlice = await anyNft.connect(alice)

      for (let index = 1; index <= numTokens; index++) {
        await anyNft.mintItem(aliceAddress, 'test' + index.toString())
      }
      
      // Deploy ERC20 contract
      anyErc20 = (await AnyERC20.deploy()) as AnyErc20
      anyOtherErc20 = (await AnyERC20.deploy()) as AnyErc20
      
      anyErc20AsAlice = await anyErc20.connect(alice)
      anyOtherErc20AsAlice = await anyOtherErc20.connect(alice)
      
      await anyErc20.mint(aliceAddress, 100)
      await anyOtherErc20.mint(aliceAddress, 50)
      
      escrowMinion = (await EscrowMinion.deploy()) as EscrowMinion
      escrowMinionAsAlice = await escrowMinion.connect(alice)
      
      // deploy Moloch and Minion
      moloch = (await Moloch.deploy()) as Moloch
      await moloch.init([deployerAddress], [anyErc20.address], 5, 5, 1, 0, 3, 0, [1])

      await anyErc20.mint(moloch.address, 50)
      await moloch.collectTokens(anyErc20.address)

      vanillaMinion = (await VanillaMinion.deploy()) as VanillaMinion
      await vanillaMinion.init(moloch.address)
      
    })
    
    it('Sets up the tests', async function () {
      for (let index = 1; index <= numTokens; index++) {
        expect(await anyNft.ownerOf(index)).to.equal(aliceAddress)
      }
      expect( await anyErc20.balanceOf(aliceAddress)).to.equal(100)
    })

    describe('EscrowMinion', function () {
      it('Can send NFTs to vanilla minion', async function () {
        await anyNftAsAlice.transferFrom(aliceAddress, vanillaMinion.address, 1)
        expect(await anyNft.ownerOf(1)).to.equal(vanillaMinion.address)

      })
      it('Moves NFT into minion during proposal', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], vanillaMinion.address, [5,0,0], 'test')
        
        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)

      })

      it('Moves NFT into vault if proposal passes', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], vanillaMinion.address, [5,0,0], 'test')
        
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
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], vanillaMinion.address, [5,0,0], 'test')
        
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

      it('Increases the loot of the applicant', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], vanillaMinion.address, [5,5,0], 'test')
        
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
        expect((await moloch.members(aliceAddress)).loot).to.equal(5)

      })

      it('Increases the withdrawable balance of the applicant', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], vanillaMinion.address, [0,0,5], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)

        await escrowMinionAsAlice.executeAction(0, moloch.address)
        await fastForwardBlocks(1)

        expect(await anyNft.ownerOf(1)).to.equal(vanillaMinion.address)
        expect(await moloch.userTokenBalances(aliceAddress, anyErc20.address)).to.equal(5)

      })

      it('Returns NFT to applicant if proposal fails', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], vanillaMinion.address, [5,0,0], 'test')
        
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
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], vanillaMinion.address, [5,0,0], 'test')

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        expect(escrowMinionAsAlice.executeAction(0, moloch.address)).to.be.revertedWith('proposal not processed')
      })

      it('Returns NFT to applicant if proposal is cancelled', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], vanillaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
      })

      it('Cannot cancel after sponsoring', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], vanillaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        expect(escrowMinionAsAlice.cancelAction(0, moloch.address)).to.be.revertedWith('proposal has already been sponsored')
      })

    // multi escrow

      it('Moves multiple NFTs into vault if proposal passes', async function () {
        await anyNftAsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], vanillaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.executeAction(0, moloch.address)

        expect(await anyNft.ownerOf(1)).to.equal(vanillaMinion.address)
        expect(await anyNft.ownerOf(2)).to.equal(vanillaMinion.address)
        expect(await anyNft.ownerOf(4)).to.equal(vanillaMinion.address)

      })

      it('Fails is some NFTs not approved', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        expect(escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], vanillaMinion.address, [5,0,0], 'test')).to.be.revertedWith('ERC721: transfer caller is not owner nor approved')
      })

      it('Moves multiple NFTs to applicant if proposal fails', async function () {
        await anyNftAsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], vanillaMinion.address, [5,0,0], 'test')

        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)
        expect(await anyNft.ownerOf(2)).to.equal(escrowMinion.address)
        expect(await anyNft.ownerOf(4)).to.equal(escrowMinion.address)
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 2)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.executeAction(0, moloch.address)

        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
        expect(await anyNft.ownerOf(2)).to.equal(aliceAddress)
        expect(await anyNft.ownerOf(4)).to.equal(aliceAddress)

      })

      it('Moves multiple NFTs to applicant if proposal is canceled', async function () {
        await anyNftAsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], vanillaMinion.address, [5,0,0], 'test')

        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)
        expect(await anyNft.ownerOf(2)).to.equal(escrowMinion.address)
        expect(await anyNft.ownerOf(4)).to.equal(escrowMinion.address)

        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
        expect(await anyNft.ownerOf(2)).to.equal(aliceAddress)
        expect(await anyNft.ownerOf(4)).to.equal(aliceAddress)

      })

    // ERC20 Escrow

      it('Moves ERC20s into escrow when proposal submitted', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        expect(await anyErc20.allowance(aliceAddress, escrowMinion.address)).to.equal(100)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address], [[0,0,100]], vanillaMinion.address, [5,0,0], 'test')
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(escrowMinion.address)).to.equal(100)
      })

      it('Moves ERC20s into vault if proposal passes', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address], [[0,0,100]], vanillaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.executeAction(0, moloch.address)

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(vanillaMinion.address)).to.equal(100)
      })

      it('Moves ERC20s to applicant if proposal fails', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address], [[0,0,100]], vanillaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 2)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.executeAction(0, moloch.address)

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(100)
        expect(await anyErc20.balanceOf(vanillaMinion.address)).to.equal(0)
      })

      it('Moves ERC20s to applicant if proposal is canceled', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address], [[0,0,100]], vanillaMinion.address, [5,0,0], 'test')
        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(100)
        expect(await anyErc20.balanceOf(vanillaMinion.address)).to.equal(0)
      })
      
      // multi ERC20

      it('Moves multiple ERC20s into vault if proposal passes', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyOtherErc20AsAlice.approve(escrowMinion.address, 50)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyOtherErc20.address], [[0,0,100], [0,0,50]], vanillaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.executeAction(0, moloch.address)

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(vanillaMinion.address)).to.equal(100)
        expect(await anyOtherErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyOtherErc20.balanceOf(vanillaMinion.address)).to.equal(50)
      })
    
    
    // Mix ERC20 and ERC721
      it('Moves ERC20s and ERC721s into escrow when proposal submitted', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address], [[0,0,100], [1,1,0]], vanillaMinion.address, [5,0,0], 'test')
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(escrowMinion.address)).to.equal(100)
        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)
      })

      it('Moves ERC20s and ERC721s into minion if proposal passes', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address], [[0,0,100], [1,1,0]], vanillaMinion.address, [5,0,0], 'test')

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.executeAction(0, moloch.address)
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(vanillaMinion.address)).to.equal(100)
        expect(await anyNft.ownerOf(1)).to.equal(vanillaMinion.address)
      })

      it('Moves ERC20s and ERC721s to applicant if proposal fails', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address], [[0,0,100], [1,1,0]], vanillaMinion.address, [5,0,0], 'test')

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 2)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.executeAction(0, moloch.address)
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(100)
        expect(await anyErc20.balanceOf(vanillaMinion.address)).to.equal(0)
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
      })

      it('Moves ERC20s and ERC721s to applicant if proposal is cancelled', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address], [[0,0,100], [1,1,0]], vanillaMinion.address, [5,0,0], 'test')

        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(100)
        expect(await anyErc20.balanceOf(vanillaMinion.address)).to.equal(0)
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
      })
    
      
    })



  })
})

