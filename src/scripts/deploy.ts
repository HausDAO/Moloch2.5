import { ethers } from 'hardhat'
import { SafeMinion } from '../types/SafeMinion'
import { SafeMinionSummoner } from '../types/SafeMinionSummoner'

async function main() {
  const accounts = await ethers.getSigners()

  console.log(
    'Accounts:',
    accounts.map((a) => a.address)
  )
  
  const rinkebyMolochTemplate = '0x0f7c5Cb02cFA159056cC2ffDa45AC856715f0c1A'
  
  const rinkebyGnosisTemplate = '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552'
  const rinkebyMultisend = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761'
  const rinkebyFallback = '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4'

  const SafeMinion = await ethers.getContractFactory('SafeMinion')
  const SafeMinionSummoner = await ethers.getContractFactory('SafeMinionSummoner')
  // const ConditionalMinionTemplate = await ethers.getContractFactory('ConditionalMinion')
  // const ConditionalMinionSummoner = await ethers.getContractFactory('ConditionalMinionFactory')
  // const ERC1271MinionTemplate = await ethers.getContractFactory('ERC1271Minion')
  // const ERC1271MinionSummoner = await ethers.getContractFactory('ERC1271MinionFactory')
  console.log('ready for deploy')

  const safeMinionTemplate = (await SafeMinion.deploy({gasLimit: 3000000})) as SafeMinion
  console.log({safeMinionTemplate})
  await safeMinionTemplate.deployTransaction.wait()
  console.log('safe deployed')
  const safeMinionSummoner = (await SafeMinionSummoner.deploy(safeMinionTemplate.address, rinkebyMolochTemplate, rinkebyGnosisTemplate, rinkebyFallback, rinkebyMultisend)) as SafeMinionSummoner

  // const conditionalMinionTemplate = (await ConditionalMinionTemplate.deploy()) as ConditionalMinion
  // const conditionalMinionFactory = await ConditionalMinionSummoner.deploy(conditionalMinionTemplate.address)

  // const erc1271MinionTemplate = (await ERC1271MinionTemplate.deploy()) as Erc1271Minion
  // const erc1271MinionFactory = await ERC1271MinionSummoner.deploy(erc1271MinionTemplate.address)

  console.log('waiting for deployment')

  console.log({
    safeMinionSummoner: safeMinionSummoner.address,
    safeMinionTemplate: safeMinionTemplate.address,
    // conditionalMinionFactory: conditionalMinionFactory.address,
    // erc1271MinionFactory: erc1271MinionFactory.address,
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
