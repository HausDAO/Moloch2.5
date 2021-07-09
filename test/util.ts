import { ethers } from 'hardhat'

export const fastForwardTime = async (seconds: number) => {
  await ethers.provider.send('evm_increaseTime', [seconds])
  await ethers.provider.send("evm_mine", [])
}

export const fastForwardBlocks = async (blocks: number) => {
  for (let index = 0; index < blocks; index++) {
    await ethers.provider.send("evm_mine", [])
  }
}
