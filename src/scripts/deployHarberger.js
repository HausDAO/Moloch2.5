const { ethers } = require('hardhat');



const networkName = {
	4: 'Rinkeby',
	1: 'mainnet',
	137: 'matic'
};

const networkCurrency = {
	4: 'ETH',
	1: 'ETH',
	137: 'matic'
};

async function main() {
  const [deployer] = await ethers.getSigners();
	const address = await deployer.getAddress();

	console.log('Account address:', address);
	console.log(
		'Account balance:',
		ethers.utils.formatEther(await deployer.provider.getBalance(address))
	);
  
  const moloch = "0xC97386316d4047027628c6E78c6DE8dD033fB9c7";
  const token = "0xaFF4481D10270F50f203E0763e2597776068CBc5";
  const periodLength = 60;
  const cooldown = 2;
  
  const PCO = await ethers.getContractFactory('HarbergerNft')

  console.log('ready for deploy')

  const PCOContract = (await PCO.deploy(
    moloch,
    token,
    periodLength,
    cooldown));
  await PCOContract.deployTransaction.wait()


  console.log('waiting for deployment');

  console.log({
    pcoShaman: PCOContract.address,
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
