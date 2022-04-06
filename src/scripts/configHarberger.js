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
  

  const harbergerAddress = "0x3249eEE788c1D4D339fBa59746dEA8D1a0906293";
  
  const PCO = await ethers.getContractFactory('HarbergerNft')

  console.log('ready for transaction')


  const harbergerContract = (await PCO.attach(harbergerAddress));

  const setURI = await harbergerContract.setBaseURI("https://gateway.pinata.cloud/ipfs/QmW3Q3ds1f2apm49nYniHgsMaMJAxCGrFNdsG72haTyxEi")


  console.log('tx hash:', setURI.hash);


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
