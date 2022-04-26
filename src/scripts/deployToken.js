const hre = require("hardhat");


const networkName = {
	4: 'Rinkeby',
	1: 'mainnet',
	137: 'matic',
	100: 'gnosis chain'
};

const networkCurrency = {
	4: 'ETH',
	1: 'ETH',
	100: 'xDai'
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
	const address = await deployer.getAddress();

  const { chainId } = await deployer.provider.getNetwork();
	console.log('Summoning a Token on network:', networkName[chainId]);

  console.log('Account address:', address);
	console.log(
		'Account balance:',
		hre.ethers.utils.formatEther(await deployer.provider.getBalance(address))
	);
  

  const Wargames = await hre.ethers.getContractFactory("Wargames");
  const wargames = await Wargames.attach("0x65e1738344eb68c7e2f4279ad9e1f7c253a09911");

  // await wargames.deployed();

  // await wargames.deployTransaction.wait()

  //await wargames.mint("0xe4b37310b5dfb86c34f9544620113b30d936fd67", "100000000000000000000000")

  await wargames.transferOwnership("0xe4b37310b5dfb86c34f9544620113b30d936fd67");

  console.log("wargames deployed to:", wargames.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
