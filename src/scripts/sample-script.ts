import { ethers } from "hardhat";
import {env} from "../config";


async function main() {
  const accounts = await ethers.getSigners();

  console.log("Accounts:", accounts.map(a => a.address));
  
  console.log({env})

  // const Greeter = await ethers.getContractFactory("Greeter");
  // const greeter = await Greeter.deploy("Hello, Hardhat!");

  // await greeter.deployed();

  // console.log("Greeter deployed to:", greeter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
