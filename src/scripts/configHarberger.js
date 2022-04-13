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
  

  const harbergerAddress = "0xc9F41D6151193695776E367e4c6123de94a9df84";
  
  const PCO = await ethers.getContractFactory('HarbergerNft')

  console.log('ready for transaction')


  const harbergerContract = (await PCO.attach(harbergerAddress));

  const setURI = await harbergerContract.setBaseURI("https://daohaus.mypinata.cloud/ipfs/QmRruYy8CkYTpQGYhQV3mj5nbXmmPLUc312FwvUT85TuyJ")


  console.log('tx hash:', setURI.hash);


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
