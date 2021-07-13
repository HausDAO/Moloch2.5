import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory } from 'ethers'
import { use, expect } from 'chai'
import { AnyErc20 } from '../src/types/AnyErc20'
import { Moloch } from '../src/types/Moloch'
import { NeapolitanMinion } from '../src/types/NeapolitanMinion'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { fastForwardBlocks } from './util'

use(solidity)

describe('Multi-call Minion', function () {
  let Moloch: ContractFactory
  let moloch: Moloch

  let molochAsAlice: Moloch

  let NeapolitanMinion: ContractFactory
  let neapolitanMinion: NeapolitanMinion

  let neapolitanMinionAsAlice: NeapolitanMinion

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
    NeapolitanMinion = await ethers.getContractFactory('NeapolitanMinion')
    AnyNft = await ethers.getContractFactory('AnyNFT')
    AnyERC20 = await ethers.getContractFactory('AnyERC20')
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
  describe.only('Minions', function () {
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

      neapolitanMinion = (await NeapolitanMinion.deploy()) as NeapolitanMinion
      await neapolitanMinion.init(moloch.address)
      neapolitanMinionAsAlice = await neapolitanMinion.connect(alice)

      // send some erc20 to minion
      await anyErc20.mint(neapolitanMinion.address, 500)

      totalAccountingAddress = await moloch.TOTAL()
      guildAccountingAddress = await moloch.GUILD()

      await fastForwardBlocks(5)
    })

    it('Sets up the tests', async function () {
      expect(await anyErc20.balanceOf(moloch.address)).to.equal(10000)
      expect(await anyErc20.balanceOf(neapolitanMinion.address)).to.equal(500)
      expect(await moloch.totalGuildBankTokens()).to.equal(1)
      expect(await moloch.userTokenBalances(guildAccountingAddress, anyErc20.address)).to.equal(10000)
      expect(await moloch.userTokenBalances(totalAccountingAddress, anyErc20.address)).to.equal(10000)
      expect((await moloch.members(aliceAddress)).shares).to.equal(50)
      expect((await moloch.members(deployerAddress)).shares).to.equal(100)
    })

    describe('Multi-call', function () {
      it('Enables 2 actions to be associated with one proposal', async function () {
        const action_1 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        const action_2 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 20])

        await neapolitanMinion.proposeAction([anyErc20.address, anyErc20.address], [0, 0], [action_1, action_2], 'test')

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)

        await moloch.processProposal(0)

        await neapolitanMinion.executeAction(0, [anyErc20.address, anyErc20.address], [0, 0], [action_1, action_2])

        expect(await anyErc20.balanceOf(aliceAddress)).to.equal(30)
        expect(await anyErc20.balanceOf(neapolitanMinion.address)).to.equal(470)
      })

      it('Fails if an executed action is different from a proposed action', async function () {
        const action_1 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 10])
        const action_2 = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 20])

        const invalid_action = anyErc20.interface.encodeFunctionData('transfer', [aliceAddress, 30])

        await neapolitanMinion.proposeAction([anyErc20.address, anyErc20.address], [0, 0], [action_1, action_2], 'test')

        await fastForwardBlocks(1)
        await moloch.sponsorProposal(0)

        await fastForwardBlocks(5)
        await moloch.submitVote(0, 1)

        await fastForwardBlocks(31)

        await moloch.processProposal(0)

        expect(neapolitanMinion.executeAction(0, [anyErc20.address, anyErc20.address], [0, 0], [action_1, invalid_action])).to.be.revertedWith('Minion: not a valid operation')
      })
    })
  })
})
