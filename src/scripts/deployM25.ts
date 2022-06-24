import { ethers } from 'hardhat'
import { Moloch } from '../types/Moloch'
import { MolochSummoner } from '../types/MolochSummoner'
import { kovan, mainnet, polygon, rinkeby, xdai } from '../util/contractAddresses'

async function main() {
  const accounts = await ethers.getSigners()

  console.log(
    'Accounts:',
    accounts.map((a) => a.address)
  )
  
  // const contractAddresses = polygon
  // const contractAddresses = mainnet
  // const contractAddresses = mainnet
  // const contractAddresses = xdai
  
  const Moloch = await ethers.getContractFactory('Moloch')
  const MolochSummoner = await ethers.getContractFactory('MolochSummoner')

  console.log('ready for deploy')

  const molochTemplate = (await Moloch.deploy()) as Moloch
  console.log({molochTemplate})
  await molochTemplate.deployTransaction.wait()
  console.log('safe deployed')
  const molochSummoner = (await MolochSummoner.deploy(
    molochTemplate.address)) as MolochSummoner

  console.log('waiting for deployment')

  console.log({
    molochSummoner: molochSummoner.address,
    molochTemplate: molochTemplate.address,
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
