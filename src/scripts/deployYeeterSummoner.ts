import { ethers } from 'hardhat'
import { Moloch } from '../types/Moloch'
import { Yeeter } from '../types/Yeeter'
import { YeetSummoner } from '../types/YeetSummoner'

import { mainnet, polygon, xdai } from '../util/contractAddresses'

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
  
  const Yeeter = await ethers.getContractFactory('Yeeter')

  console.log('ready for deploy')

  const yeeter = (await Yeeter.deploy()) as Yeeter
  await yeeter.deployTransaction.wait()


  console.log('yeeter deployed')

  const YeetSummoner = await ethers.getContractFactory('YeetSummoner')
  const yeetSummoner = (await YeetSummoner.deploy(yeeter.address)) as Yeeter
  await yeetSummoner.deployTransaction.wait()


  console.log('waiting for deployment')

  console.log({
    YeeterTemplate: yeeter.address,
    YeetSummoner: yeetSummoner.address
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
