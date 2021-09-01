import { encodeMultiSend, MetaTransaction } from '@gnosis.pm/safe-contracts';
import { ethers } from 'hardhat'
import { Moloch } from "../src/types/Moloch";
import { MultiSend } from '../src/types/MultiSend';

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

export const encodeMultiAction = (multisend: MultiSend, actions: string[], tos: string[], operations: number[]) => {
  let metatransactions: MetaTransaction[] = []
  for (let index = 0; index < actions.length; index++) {
    metatransactions.push({
      to: tos[index],
      value: 0,
      data: actions[index],
      operation: operations[index]
    })
    
  }
    const encodedMetatransactions = encodeMultiSend(metatransactions)
    const multi_action = multisend.interface.encodeFunctionData("multiSend", [encodedMetatransactions])
    return multi_action

}