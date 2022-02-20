async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const Daogroni = await ethers.getContractFactory("Daogroni");
    // rinkeby
    // const daogroni = await Daogroni.deploy("0x9422BAce441461b8d3Dc31D5D64aFadE371ff95A", "0xc778417E063141139Fce010982780140Aa0cD5Ab");
    // xdai
    const daogroni = await Daogroni.deploy("0xcc6a847d7df52ae1904d21781ab34ea61d6f3a1c", "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d");
    
    console.log("Daogroni address:", daogroni.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });