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

  const minionSummoner = "0x121931c0Bc458A5f13F3861444AeB036cc8a5363"
  const daoSummoner = "0x39bDc48E7b15C63FE54779E93b2ce46555A37609"
  
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
