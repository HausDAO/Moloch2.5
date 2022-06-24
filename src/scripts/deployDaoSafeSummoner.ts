import { ethers } from 'hardhat'
import { Moloch } from '../types/Moloch'
import { DaoSafeMinionSummoner } from '../types/DaoSafeMinionSummoner'
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

  const minionSummoner = "0x594AF060c08EeA9f559Bc668484E50596BcB2CFB"
  const daoSummoner = "0xf5add874c8c79b7fa8a86291549a4add50553e52"
  
  const Summoner = await ethers.getContractFactory('DaoSafeMinionSummoner')

  console.log('ready for deploy')

  const summoner = (await Summoner.deploy(
    minionSummoner,
    daoSummoner
    )) as DaoSafeMinionSummoner
  await summoner.deployTransaction.wait()
  console.log('summoner deployed')

  console.log('waiting for deployment')

  console.log({
    DaoSafeSummoner: summoner.address,
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
