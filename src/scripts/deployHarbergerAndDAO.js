const { ethers } = require('hardhat');

const { randomBytes } = require('crypto');



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

const generateNonce = async () => {
  const buffer = await randomBytes(32);
  return buffer.toString("hex");
};

async function main() {
  const [deployer] = await ethers.getSigners();
	const address = await deployer.getAddress();

	console.log('Account address:', address);
	console.log(
		'Account balance:',
		ethers.utils.formatEther(await deployer.provider.getBalance(address))
	);
  
  // Rikkeby
  const token = "0xaFF4481D10270F50f203E0763e2597776068CBc5";
  const MolochFactory = "0x61f71A402779108f25aD4B369Dd217d3F008B458";
  // use your address
  const summonerAddress = "0xCED608Aa29bB92185D9b6340Adcbfa263DAe075b";
  const periodLength = 60;
  const cooldown = 2;
  
  const PCO = await ethers.getContractFactory('HarbergerNft')
  const DaoFactory = await ethers.getContractFactory('DaoSafeMinionSummoner')
  const DaoFactoryContract = (await DaoFactory.attach(MolochFactory));

  const salt = await generateNonce();

  console.log('ready for deploy')

  const summon = await DaoFactoryContract.summonDaoMinionAndSafe(
    "0x" + salt,
    300,
    1,
    1,
    [token],
    "pico"
  );

  await summon.wait()


  const idx = await DaoFactoryContract.daoIdx();
  const dsm = await DaoFactoryContract.daos(idx);

  const PCOContract = (await PCO.deploy(
    dsm.moloch,
    token,
    periodLength,
    cooldown));
  await PCOContract.deployTransaction.wait()

  const setup = await DaoFactoryContract.setUpDaoMinionAndSafe(
    idx,
    [address, summonerAddress],
    [1, 1],
    [0, 0],
    [PCOContract.address]
  )


  console.log('waiting for setup');
  await setup.wait()

  console.log('config nft shamin');

  const setURI = await PCOContract.setBaseURI("https://daohaus.mypinata.cloud/ipfs/QmRruYy8CkYTpQGYhQV3mj5nbXmmPLUc312FwvUT85TuyJ")

  console.log({
    pcoShaman: PCOContract.address,
    moloch: dsm.moloch,
    deployerAddress: address,
    summonerAddress
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
