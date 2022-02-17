async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const Daogroni = await ethers.getContractFactory("Daogroni");
    const daogroni = await Daogroni.deploy("0xEA54Fb562c77272550aE50FbF1Ca6a3fCAa431E6", "0xc778417E063141139Fce010982780140Aa0cD5Ab");
  
    console.log("Daogroni address:", daogroni.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });