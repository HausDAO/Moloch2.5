import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { use, expect } from 'chai'
import { AnyErc20 } from '../src/types/AnyErc20'
import { Moloch } from '../src/types/Moloch'
import { ConditionalMinion } from '../src/types/ConditionalMinion'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { fastForwardBlocks } from './util'

use(solidity)

describe('Conditional Minion', function () {
  let Moloch: ContractFactory
  let moloch: Moloch
  
  let molochAsAlice: Moloch
  
  let ConditionalMinion: ContractFactory
  let conditionalMinion: ConditionalMinion

  let VanillaMinion: ContractFactory

  let conditionalMinionAsAlice: ConditionalMinion

  let AnyNft: ContractFactory

  let AnyERC20: ContractFactory
  let anyErc20: AnyErc20

  let signers: SignerWithAddress[]

  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress

  const zeroAddress = '0x0000000000000000000000000000000000000000'
  let totalAccountingAddress: string
  let guildAccountingAddress: string

  let deployerAddress: string
  let aliceAddress: string
  let bobAddress: string

  this.beforeAll(async function () {
    Moloch = await ethers.getContractFactory('Moloch')
    ConditionalMinion = await ethers.getContractFactory('ConditionalMinion')
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

      conditionalMinion = (await ConditionalMinion.deploy()) as ConditionalMinion
      await conditionalMinion.init(moloch.address)
      conditionalMinionAsAlice = await conditionalMinion.connect(alice)
      
      // send some erc20 to minion
      await anyErc20.mint(conditionalMinion.address, 500)
      
      totalAccountingAddress = await moloch.TOTAL()
      guildAccountingAddress = await moloch.GUILD()
      
      await fastForwardBlocks(5)
      
    })
    
    it('Sets up the tests', async function () {
      expect(await anyErc20.balanceOf(moloch.address)).to.equal(10000)
      expect(await moloch.totalGuildBankTokens()).to.equal(1)
      expect(await moloch.userTokenBalances(guildAccountingAddress, anyErc20.address)).to.equal(10000)
      expect(await moloch.userTokenBalances(totalAccountingAddress, anyErc20.address)).to.equal(10000)
      expect((await moloch.members(aliceAddress)).shares).to.equal(50)
      expect((await moloch.members(deployerAddress)).shares).to.equal(100)
    })
    
    describe('Conditions', function () {
      it('Blocks a minion proposal based on an arbitrary external condition', async function () {
        const condition = anyErc20.interface.encodeFunctionData('balanceOf', [aliceAddress])
        const expectedCondition = await ethers.provider.call({to: anyErc20.address, data: condition})

        // invaliate condition
        await anyErc20.mint(aliceAddress, 10)
        const action = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        

        await conditionalMinion.proposeAction(anyErc20.address, 0, action, condition, anyErc20.address, expectedCondition, 'test', 0, 0)
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 1)
        
        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        expect(conditionalMinionAsAlice.executeAction(0)).to.be.revertedWith('Condition return does not match expected state')
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(10)
        expect(await anyErc20.balanceOf(conditionalMinion.address)).to.equal(500)
      })
      it('Enables a minion proposal based on an arbitrary external condition', async function () {
        const action = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        
        // Expect that Alice's token balance is 0 for minion to execute
        const condition = anyErc20.interface.encodeFunctionData('balanceOf', [aliceAddress])
        const expectedCondition = await ethers.provider.call({to: anyErc20.address, data: condition})

        await conditionalMinion.proposeAction(anyErc20.address, 0, action, condition, anyErc20.address, expectedCondition, 'test', 0, 0)
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 1)
        
        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await conditionalMinionAsAlice.executeAction(0)
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(10)
        expect(await anyErc20.balanceOf(conditionalMinion.address)).to.equal(490)
      })
      it('Blocks a minion proposal based on moloch share count', async function () {
        
        const action = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        const condition = moloch.interface.encodeFunctionData('members', [aliceAddress])
        // const expectedCondition = await ethers.provider.call({to: moloch.address, data: condition})
        const expectedCondition = '0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
        

        await conditionalMinion.proposeAction(anyErc20.address, 0, action, condition, moloch.address, expectedCondition, 'test', 0, 0)
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 1)
        
        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        expect(conditionalMinionAsAlice.executeAction(0)).to.be.revertedWith('Condition return does not match expected state')
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(0)
        expect(await anyErc20.balanceOf(conditionalMinion.address)).to.equal(500)
      })
      it('Enables a minion proposal based on moloch share count', async function () {
        const action = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        
        // Expect that Alice's share balance is 0 for minion to execute
        const condition = moloch.interface.encodeFunctionData('members', [aliceAddress])
        // const expectedCondition = await ethers.provider.call({to: moloch.address, data: condition})
        const expectedCondition = '0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

        await conditionalMinion.proposeAction(anyErc20.address, 0, action, condition, moloch.address, expectedCondition, 'test', 0, 0)
        
        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 1)
        
        await fastForwardBlocks(31)
        
        await moloch.processProposal(0)
        
        await molochAsAlice.ragequit(50, 0)
        
        await conditionalMinionAsAlice.executeAction(0)
        
        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(10)
        expect(await anyErc20.balanceOf(conditionalMinion.address)).to.equal(490)
      })


    })


  })
})

