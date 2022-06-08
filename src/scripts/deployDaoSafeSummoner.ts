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

  const minionSummoner = "0xBD090EF169c0C8589Acb33406C29C20d22bb4a55"
  const daoSummoner = "0x56faa6adcf15c5033f9b576426543522e5fd3e59"
  
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
