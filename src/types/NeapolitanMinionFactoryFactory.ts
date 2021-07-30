/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import { Contract, ContractFactory, Overrides } from "@ethersproject/contracts";

import type { NeapolitanMinionFactory } from "./NeapolitanMinionFactory";

export class NeapolitanMinionFactoryFactory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _template: string,
    overrides?: Overrides
  ): Promise<NeapolitanMinionFactory> {
    return super.deploy(
      _template,
      overrides || {}
    ) as Promise<NeapolitanMinionFactory>;
  }
  getDeployTransaction(
    _template: string,
    overrides?: Overrides
  ): TransactionRequest {
    return super.getDeployTransaction(_template, overrides || {});
  }
  attach(address: string): NeapolitanMinionFactory {
    return super.attach(address) as NeapolitanMinionFactory;
  }
  connect(signer: Signer): NeapolitanMinionFactoryFactory {
    return super.connect(signer) as NeapolitanMinionFactoryFactory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): NeapolitanMinionFactory {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as NeapolitanMinionFactory;
  }
}

const _abi = [
  {
    inputs: [
      {
        internalType: "address payable",
        name: "_template",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "minion",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "moloch",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "details",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "minionType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "minQuorum",
        type: "uint256",
      },
    ],
    name: "SummonMinion",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "minionList",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "minions",
    outputs: [
      {
        internalType: "address",
        name: "moloch",
        type: "address",
      },
      {
        internalType: "string",
        name: "details",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "moloch",
        type: "address",
      },
      {
        internalType: "string",
        name: "details",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "minQuorum",
        type: "uint256",
      },
    ],
    name: "summonMinion",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "template",
    outputs: [
      {
        internalType: "address payable",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x60a060405234801561001057600080fd5b506040516107c63803806107c683398101604081905261002f91610044565b60601b6001600160601b031916608052610072565b600060208284031215610055578081fd5b81516001600160a01b038116811461006b578182fd5b9392505050565b60805160601c6107306100966000396000818160be015261028e01526107306000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c80633fb88bec146100515780636f2ddd931461007a5780637b37458714610082578063d67014df14610095575b600080fd5b61006461005f3660046104b2565b6100b6565b60405161007191906105d1565b60405180910390f35b61006461028c565b61006461009036600461056e565b6102b0565b6100a86100a3366004610491565b6102da565b6040516100719291906105e5565b6000806100e27f000000000000000000000000000000000000000000000000000000000000000061038a565b9050606483111561010e5760405162461bcd60e51b815260040161010590610660565b60405180910390fd5b604051630e66b9c960e21b81526001600160a01b0382169063399ae7249061013c9088908790600401610611565b600060405180830381600087803b15801561015657600080fd5b505af115801561016a573d6000803e3d6000fd5b505060408051808201825260118152702732b0b837b634ba30b71036b4b734b7b760791b602080830191909152825180840184526001600160a01b038b811682528183018b815288821660009081526001808652969020835181546001600160a01b0319169316929092178255518051949750919550936101f3939085019291909101906103dc565b5050600080546001810182559080527f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5630180546001600160a01b0319166001600160a01b038581169182179092556040519189169250907fa7263f64fc0919758633f16671099128e3b868bb0893fcb099b19fb9ab522ade9061027b90899086908a9061062a565b60405180910390a350949350505050565b7f000000000000000000000000000000000000000000000000000000000000000081565b600081815481106102c057600080fd5b6000918252602090912001546001600160a01b0316905081565b6001602081905260009182526040909120805491810180546001600160a01b0390931692610307906106a9565b80601f0160208091040260200160405190810160405280929190818152602001828054610333906106a9565b80156103805780601f1061035557610100808354040283529160200191610380565b820191906000526020600020905b81548152906001019060200180831161036357829003601f168201915b5050505050905082565b6000808260601b9050604051733d602d80600a3d3981f3363d3d373d3d3d363d7360601b81528160148201526e5af43d82803e903d91602b57fd5bf360881b60288201526037816000f0949350505050565b8280546103e8906106a9565b90600052602060002090601f01602090048101928261040a5760008555610450565b82601f1061042357805160ff1916838001178555610450565b82800160010185558215610450579182015b82811115610450578251825591602001919060010190610435565b5061045c929150610460565b5090565b5b8082111561045c5760008155600101610461565b80356001600160a01b038116811461048c57600080fd5b919050565b6000602082840312156104a2578081fd5b6104ab82610475565b9392505050565b6000806000606084860312156104c6578182fd5b6104cf84610475565b925060208085013567ffffffffffffffff808211156104ec578485fd5b818701915087601f8301126104ff578485fd5b813581811115610511576105116106e4565b604051601f8201601f1916810185018381118282101715610534576105346106e4565b60405281815283820185018a101561054a578687fd5b81858501868301379081019093019490945250929592945050506040919091013590565b60006020828403121561057f578081fd5b5035919050565b60008151808452815b818110156105ab5760208185018101518683018201520161058f565b818111156105bc5782602083870101525b50601f01601f19169290920160200192915050565b6001600160a01b0391909116815260200190565b6001600160a01b038316815260406020820181905260009061060990830184610586565b949350505050565b6001600160a01b03929092168252602082015260400190565b60006060825261063d6060830186610586565b828103602084015261064f8186610586565b915050826040830152949350505050565b60208082526029908201527f4d696e696f6e466163746f72793a206d696e51756f72756d206d7573742062656040820152680203020746f203130360bc1b606082015260800190565b6002810460018216806106bd57607f821691505b602082108114156106de57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fdfea26469706673582212209d3b75795ea42691f14d69049660ee563cc83bb570a35ddd6c12fc4b62b136b264736f6c63430008000033";
