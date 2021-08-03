import { ethers } from 'hardhat'
import { Moloch } from "../src/types/Moloch";

export const fastForwardTime = async (seconds: number) => {
  await ethers.provider.send('evm_increaseTime', [seconds])
  await ethers.provider.send("evm_mine", [])
}

export const fastForwardBlocks = async (blocks: number) => {
  for (let index = 0; index < blocks; index++) {
    await ethers.provider.send("evm_mine", [])
  }
}

export const doProposal = async (pass: boolean, proposalId: number, moloch: Moloch) => {
  
  await fastForwardBlocks(1);
  await moloch.sponsorProposal(proposalId);

  await fastForwardBlocks(5);
  await moloch.submitVote(proposalId, pass ? 1 : 2);

  await fastForwardBlocks(31);

  await moloch.processProposal(proposalId);

}
