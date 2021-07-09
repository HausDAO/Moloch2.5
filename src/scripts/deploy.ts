import { ethers } from 'hardhat'
import { ConditionalMinion } from '../types/ConditionalMinion'
import { Erc1271Minion } from '../types/Erc1271Minion'
import { EscrowMinion } from '../types/EscrowMinion'

async function main() {
  const accounts = await ethers.getSigners()

  console.log(
    'Accounts:',
    accounts.map((a) => a.address)
  )

  const EscrowMinionTemplate = await ethers.getContractFactory('EscrowMinion')
  const ConditionalMinionTemplate = await ethers.getContractFactory('ConditionalMinion')
  const ConditionalMinionSummoner = await ethers.getContractFactory('ConditionalMinionFactory')
  const ERC1271MinionTemplate = await ethers.getContractFactory('ERC1271Minion')
  const ERC1271MinionSummoner = await ethers.getContractFactory('ERC1271MinionFactory')
  console.log('ready for deploy')

  const escrowMinion = (await EscrowMinionTemplate.deploy()) as EscrowMinion

  const conditionalMinionTemplate = (await ConditionalMinionTemplate.deploy()) as ConditionalMinion
  const conditionalMinionFactory = await ConditionalMinionSummoner.deploy(conditionalMinionTemplate.address)

  const erc1271MinionTemplate = (await ERC1271MinionTemplate.deploy()) as Erc1271Minion
  const erc1271MinionFactory = await ERC1271MinionSummoner.deploy(erc1271MinionTemplate.address)

  console.log('waiting for deployment')

  console.log({
    escrowMinion: escrowMinion.address,
    conditionalMinionFactory: conditionalMinionFactory.address,
    erc1271MinionFactory: erc1271MinionFactory.address,
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
