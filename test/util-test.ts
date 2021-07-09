import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { use, expect } from 'chai'
import { fastForwardBlocks } from './util'

use(solidity)

describe('Helpers', function () {
  describe('fast forward', function () {
    it('fast forwards blocks', async function () {
      const blockNumber = await ethers.provider.getBlockNumber()
      await fastForwardBlocks(5)
      expect(await ethers.provider.getBlockNumber()).to.equal(blockNumber + 5)

    })
  })
})

