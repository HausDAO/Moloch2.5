import { ethers } from 'hardhat'
import { HarbergerNft } from '../types/HarbergerNft'


async function main() {
  const accounts = await ethers.getSigners()

  console.log(
    'Accounts:',
    accounts.map((a) => a.address)
  )
  
  const moloch = "0x66eEACF02bF2868A7C290559058495D1738b2b90";
  const token = "0xaFF4481D10270F50f203E0763e2597776068CBc5";
  const periodLength = 60;
  const cooldown = 2;
  
  const PCO = await ethers.getContractFactory('HarbergerNFT')

  console.log('ready for deploy')

  const PCOContract = (await PCO.deploy(
    moloch,
    token,
    periodLength,
    cooldown,
  {gasLimit: 3000000, gasPrice: 80000000000})) as HarbergerNft;
  await PCOContract.deployTransaction.wait()


  console.log('waiting for deployment')

  console.log({
    safeMinionSummoner: PCOContract.address,
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
