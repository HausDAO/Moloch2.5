import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { use, expect } from 'chai'
import { AnyNft } from '../src/types/AnyNft'
import { AnyErc1155 } from '../src/types/AnyErc1155'
import { AnyErc20 } from '../src/types/AnyErc20'
import { Moloch } from '../src/types/Moloch'
import { EscrowMinion } from '../src/types/EscrowMinion'
import { NeapolitanMinion } from '../src/types/NeapolitanMinion'
import { DaoConditionalHelper } from "../src/types/DaoConditionalHelper";
import { VanillaMinion } from '../src/types/VanillaMinion'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { doProposal, fastForwardBlocks } from './util'

use(solidity)

describe('Escrow', function () {
  let Moloch: ContractFactory
  let moloch: Moloch
  
  let EscrowMinion: ContractFactory
  let escrowMinion: EscrowMinion

  let NeaMinion: ContractFactory
  let neaMinion: NeapolitanMinion

  let VanillaMinion: ContractFactory
  let vanillaMinion: VanillaMinion

  let escrowMinionAsAlice: EscrowMinion

  let AnyNft: ContractFactory
  let anyNft: AnyNft

  let Any1155: ContractFactory
  let any1155: AnyErc1155

  let AnyERC20: ContractFactory
  let anyErc20: AnyErc20
  let anyOtherErc20: AnyErc20

  let anyErc20AsAlice: AnyErc20
  let anyOtherErc20AsAlice: AnyErc20

  let anyNftAsAlice: AnyNft
  let any1155AsAlice: AnyErc1155
  let anyNftAsBob: AnyNft

  let signers: SignerWithAddress[]

  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress


  let deployerAddress: string
  let aliceAddress: string
  let bobAddress: string
  
  const numTokens = 10

  this.beforeAll(async function () {
    Moloch = await ethers.getContractFactory('Moloch')
    EscrowMinion = await ethers.getContractFactory('EscrowMinion')
    AnyNft = await ethers.getContractFactory('AnyNFT')
    Any1155 = await ethers.getContractFactory('AnyERC1155')
    AnyERC20 = await ethers.getContractFactory('AnyERC20')
    NeaMinion = await ethers.getContractFactory('NeapolitanMinion')
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

      // Deploy 1155 contract and mint NFT to alice
      any1155 = (await Any1155.deploy()) as AnyErc1155
      any1155AsAlice = await any1155.connect(alice)

      for (let index = 1; index <= numTokens; index++) {
        await anyNft.mintItem(aliceAddress, 'test' + index.toString())
        await any1155.mintItem(aliceAddress, index.toString(), 150)
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

      neaMinion = (await NeaMinion.deploy()) as NeapolitanMinion
      await neaMinion.init(moloch.address, 0)

      vanillaMinion = (await VanillaMinion.deploy()) as VanillaMinion
      await vanillaMinion.init(moloch.address)
      
    })
    
    it('Sets up the tests', async function () {
      for (let index = 1; index <= numTokens; index++) {
        expect(await anyNft.ownerOf(index)).to.equal(aliceAddress)
        expect(await any1155.balanceOf(aliceAddress, index)).to.equal(150)
      }
      expect( await anyErc20.balanceOf(aliceAddress)).to.equal(100)
    })

    describe('EscrowMinion', function () {
      it('Can send NFTs to vanilla minion', async function () {
        await anyNftAsAlice.transferFrom(aliceAddress, neaMinion.address, 1)
        expect(await anyNft.ownerOf(1)).to.equal(neaMinion.address)

      })
      it('Moves NFT into minion during proposal', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], neaMinion.address, [5,0,0], 'test')
        
        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)

      })

      it('Moves NFT into vault if proposal passes', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])

        expect(await anyNft.ownerOf(1)).to.equal(neaMinion.address)

      })

      it('Increases the shares of the applicant', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)

        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])
        await fastForwardBlocks(1)

        expect(await anyNft.ownerOf(1)).to.equal(neaMinion.address)
        expect((await moloch.members(aliceAddress)).shares).to.equal(5)

      })

      it('Increases the loot of the applicant', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], neaMinion.address, [5,5,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)

        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])
        await fastForwardBlocks(1)

        expect(await anyNft.ownerOf(1)).to.equal(neaMinion.address)
        expect((await moloch.members(aliceAddress)).shares).to.equal(5)
        expect((await moloch.members(aliceAddress)).loot).to.equal(5)

      })

      it('Increases the withdrawable balance of the applicant', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], neaMinion.address, [0,0,5], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)

        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])
        await fastForwardBlocks(1)

        expect(await anyNft.ownerOf(1)).to.equal(neaMinion.address)
        expect(await moloch.userTokenBalances(aliceAddress, anyErc20.address)).to.equal(5)

      })

      it('Returns NFT to applicant if proposal fails', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 2)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])

        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)

      })

      it('Fails to execute if proposal has not been processed', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], neaMinion.address, [5,0,0], 'test')

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        expect(escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])).to.be.revertedWith('proposal not processed')
      })

      it('Returns NFT to applicant if proposal is cancelled', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
      })

      it('Cannot cancel after sponsoring', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        expect(escrowMinionAsAlice.cancelAction(0, moloch.address)).to.be.revertedWith('proposal has already been sponsored')
      })

    // multi escrow

      it('Moves multiple NFTs into vault if proposal passes', async function () {
        await anyNftAsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1, 2])

        expect(await anyNft.ownerOf(1)).to.equal(neaMinion.address)
        expect(await anyNft.ownerOf(2)).to.equal(neaMinion.address)
        expect(await anyNft.ownerOf(4)).to.equal(neaMinion.address)

      })

      it('Moves multiple NFTs into vault if proposal passes in multiple transactions', async function () {
        await anyNftAsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [1, 2])
        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)
        expect(await anyNft.ownerOf(2)).to.equal(neaMinion.address)
        expect(await anyNft.ownerOf(4)).to.equal(neaMinion.address)

        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])
        expect(await anyNft.ownerOf(1)).to.equal(neaMinion.address)
        expect(await anyNft.ownerOf(2)).to.equal(neaMinion.address)
        expect(await anyNft.ownerOf(4)).to.equal(neaMinion.address)

      })

      it('Does not allow the same withdrawl to happen multiple times', async function () {
        await anyNftAsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1])
        expect(escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1])).to.be.revertedWith('executed')

        expect(await anyNft.ownerOf(1)).to.equal(neaMinion.address)
        expect(await anyNft.ownerOf(2)).to.equal(neaMinion.address)
        expect(await anyNft.ownerOf(4)).to.equal(escrowMinion.address)

      })

      it('Fails is some NFTs not approved', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        expect(escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], neaMinion.address, [5,0,0], 'test')).to.be.revertedWith('ERC721: transfer caller is not owner nor approved')
      })

      it('Moves multiple NFTs to applicant if proposal fails', async function () {
        await anyNftAsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], neaMinion.address, [5,0,0], 'test')

        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)
        expect(await anyNft.ownerOf(2)).to.equal(escrowMinion.address)
        expect(await anyNft.ownerOf(4)).to.equal(escrowMinion.address)
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 2)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1, 2])

        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
        expect(await anyNft.ownerOf(2)).to.equal(aliceAddress)
        expect(await anyNft.ownerOf(4)).to.equal(aliceAddress)

      })

      it('Moves multiple NFTs to applicant if proposal is canceled', async function () {
        await anyNftAsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address, anyNft.address, anyNft.address], [[1,1,0], [1,2,0], [1,4,0]], neaMinion.address, [5,0,0], 'test')

        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)
        expect(await anyNft.ownerOf(2)).to.equal(escrowMinion.address)
        expect(await anyNft.ownerOf(4)).to.equal(escrowMinion.address)

        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1, 2])
        
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
        expect(await anyNft.ownerOf(2)).to.equal(aliceAddress)
        expect(await anyNft.ownerOf(4)).to.equal(aliceAddress)

      })

    // ERC1155 Escrow

      it('Moves ERC1155s into escrow when proposal submitted', async function () {
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [any1155.address], [[2,1,100]], neaMinion.address, [5,0,0], 'test')
        
        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(50)
        expect(await any1155.balanceOf(escrowMinion.address, 1)).to.equal(100)
      })

      it('Fails to move 1155s into escrow if destination does not support them', async function () {
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)
        expect(escrowMinionAsAlice.proposeTribute(moloch.address, [any1155.address], [[2,1,100]], vanillaMinion.address, [5,0,0], 'test')).to.be.revertedWith('ERC1155: transfer to non ERC1155Receiver implementer')
        
        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(150)
        expect(await any1155.balanceOf(escrowMinion.address, 1)).to.equal(0)
      })

      it('Fails to move 721s into escrow if destination does not support them', async function () {
        await anyNft.setApprovalForAll(escrowMinion.address, true)
        expect(escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[1,1,0]], anyNft.address, [5,0,0], 'test')).to.be.revertedWith('ERC721: transfer to non ERC721Receiver implementer')
        
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
      })

      it('Moves ERC1155s into vault if proposal passes', async function () {
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [any1155.address], [[2,1,100]], neaMinion.address, [5,0,0], 'test')
        
        await doProposal(true, 0, moloch)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])

        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(50)
        expect(await any1155.balanceOf(neaMinion.address, 1)).to.equal(100)
      })

      it('Moves ERC1155s to applicant if proposal fails', async function () {
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [any1155.address], [[2,1,100]], neaMinion.address, [5,0,0], 'test')
        
        await doProposal(false, 0, moloch)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])

        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(150)
        expect(await any1155.balanceOf(neaMinion.address, 1)).to.equal(0)
      })

      it('Moves ERC1155s to applicant if proposal is canceled', async function () {
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [any1155.address], [[2,1,100]], neaMinion.address, [5,0,0], 'test')

        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])
        
        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(150)
        expect(await any1155.balanceOf(neaMinion.address, 1)).to.equal(0)
      })
      
      // multi ERC1155

      it('Moves multiple ERC1155s into vault if proposal passes', async function () {
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [any1155.address, any1155.address], [[2,1,100], [2, 2, 50]], neaMinion.address, [5,0,0], 'test')

        await doProposal(true, 0, moloch)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1])

        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(50)
        expect(await any1155.balanceOf(neaMinion.address, 1)).to.equal(100)
        expect(await any1155.balanceOf(aliceAddress, 2)).to.equal(100)
        expect(await any1155.balanceOf(neaMinion.address, 2)).to.equal(50)
      })

    // ERC20 Escrow

      it('Moves ERC20s into escrow when proposal submitted', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        expect(await anyErc20.allowance(aliceAddress, escrowMinion.address)).to.equal(100)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address], [[0,0,100]], neaMinion.address, [5,0,0], 'test')
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(escrowMinion.address)).to.equal(100)
      })

      it('Moves ERC20s into vault if proposal passes', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address], [[0,0,100]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(neaMinion.address)).to.equal(100)
      })

      it('Moves ERC20s to applicant if proposal fails', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address], [[0,0,100]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 2)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(100)
        expect(await anyErc20.balanceOf(neaMinion.address)).to.equal(0)
      })

      it('Moves ERC20s to applicant if proposal is canceled', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address], [[0,0,100]], neaMinion.address, [5,0,0], 'test')
        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0])
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(100)
        expect(await anyErc20.balanceOf(neaMinion.address)).to.equal(0)
      })
      
      // multi ERC20

      it('Moves multiple ERC20s into vault if proposal passes', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyOtherErc20AsAlice.approve(escrowMinion.address, 50)
        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyOtherErc20.address], [[0,0,100], [0,0,50]], neaMinion.address, [5,0,0], 'test')
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)
        await fastForwardBlocks(5)
        
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1])

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(neaMinion.address)).to.equal(100)
        expect(await anyOtherErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyOtherErc20.balanceOf(neaMinion.address)).to.equal(50)
      })
    
    
    // Mix ERC20 and ERC721 and 1155
      it('Moves ERC20s and ERC721s and 1155s into escrow when proposal submitted', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)

        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address, any1155.address], [[0,0,100], [1,1,0], [2, 1, 100]], neaMinion.address, [5,0,0], 'test')
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(escrowMinion.address)).to.equal(100)
        expect(await anyNft.ownerOf(1)).to.equal(escrowMinion.address)
        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(50)
        expect(await any1155.balanceOf(escrowMinion.address, 1)).to.equal(100)
      })

      it('Moves ERC20s and ERC721s and 1155s into minion if proposal passes', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)

        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address, any1155.address], [[0,0,100], [1,1,0], [2, 1, 100]], neaMinion.address, [5,0,0], 'test')

        await doProposal(true, 0, moloch)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1, 2])
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(neaMinion.address)).to.equal(100)
        expect(await anyNft.ownerOf(1)).to.equal(neaMinion.address)
        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(50)
        expect(await any1155.balanceOf(neaMinion.address, 1)).to.equal(100)
      })

      it('Moves ERC20s and ERC721s and 1155s to applicant if proposal fails', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)

        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address, any1155.address], [[0,0,100], [1,1,0], [2, 1, 100]], neaMinion.address, [5,0,0], 'test')

        await doProposal(false, 0, moloch)
        
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1, 2])
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(100)
        expect(await anyErc20.balanceOf(neaMinion.address)).to.equal(0)
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(150)
        expect(await any1155.balanceOf(neaMinion.address, 1)).to.equal(0)
      })

      it('Moves ERC20s and ERC721s and 1155s to applicant if proposal is cancelled', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)

        await escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address, any1155.address], [[0,0,100], [1,1,0], [2, 1, 100]], neaMinion.address, [5,0,0], 'test')

        await fastForwardBlocks(1)
        await escrowMinionAsAlice.cancelAction(0, moloch.address)
        await escrowMinionAsAlice.withdrawToDestination(0, moloch.address, [0, 1, 2])
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(100)
        expect(await anyErc20.balanceOf(neaMinion.address)).to.equal(0)
        expect(await anyNft.ownerOf(1)).to.equal(aliceAddress)
        expect(await any1155.balanceOf(aliceAddress, 1)).to.equal(150)
        expect(await any1155.balanceOf(neaMinion.address, 1)).to.equal(0)
      })
    
      it('Fails to create a proposal with an invalid token type', async function () {
        await anyNftAsAlice.approve(escrowMinion.address, 1)

        expect(escrowMinionAsAlice.proposeTribute(moloch.address, [anyNft.address], [[3,1,0]], neaMinion.address, [5,0,0], 'test')).to.be.revertedWith('Invalid type')

      })

      it('Fails to create a proposal with a 0 token amount', async function () {
        await anyErc20AsAlice.approve(escrowMinion.address, 100)
        await anyNftAsAlice.approve(escrowMinion.address, 1)
        await any1155AsAlice.setApprovalForAll(escrowMinion.address, true)

        expect(escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address, any1155.address], [[0,0,100], [1,1,0], [2, 1, 0]], neaMinion.address, [5,0,0], 'test')).to.be.revertedWith('!amount')
        expect(escrowMinionAsAlice.proposeTribute(moloch.address, [anyErc20.address, anyNft.address, any1155.address], [[0,0,0], [1,1,0], [2, 1, 100]], neaMinion.address, [5,0,0], 'test')).to.be.revertedWith('!amount')


      })
      
      
    })



  })
  
  
})

