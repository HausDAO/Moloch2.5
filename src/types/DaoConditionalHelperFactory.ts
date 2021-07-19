/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import { Contract, ContractFactory, Overrides } from "@ethersproject/contracts";

import type { DaoConditionalHelper } from "./DaoConditionalHelper";

export class DaoConditionalHelperFactory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(overrides?: Overrides): Promise<DaoConditionalHelper> {
    return super.deploy(overrides || {}) as Promise<DaoConditionalHelper>;
  }
  getDeployTransaction(overrides?: Overrides): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): DaoConditionalHelper {
    return super.attach(address) as DaoConditionalHelper;
  }
  connect(signer: Signer): DaoConditionalHelperFactory {
    return super.connect(signer) as DaoConditionalHelperFactory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): DaoConditionalHelper {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as DaoConditionalHelper;
  }
}

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "isAfter",
    outputs: [],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "address",
        name: "dao",
        type: "address",
      },
    ],
    name: "isDaoMember",
    outputs: [],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "address",
        name: "dao",
        type: "address",
      },
    ],
    name: "isNotDaoMember",
    outputs: [],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5061048f806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c806319956d2f14610046578063c49914221461005b578063dff9cbe21461006e575b600080fd5b6100596100543660046103c1565b610081565b005b610059610069366004610326565b6100ac565b61005961007c366004610326565b6101db565b4281106100a95760405162461bcd60e51b81526004016100a0906103ed565b60405180910390fd5b50565b60405163100b05e560e21b815281906000906001600160a01b0383169063402c1794906100dd9087906004016103d9565b60206040518083038186803b1580156100f557600080fd5b505afa158015610109573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061012d9190610303565b90506000826001600160a01b03166308ae4b0c836040518263ffffffff1660e01b815260040161015d91906103d9565b60c06040518083038186803b15801561017557600080fd5b505afa158015610189573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101ad919061035e565b50505050915050600081116101d45760405162461bcd60e51b81526004016100a090610419565b5050505050565b60405163100b05e560e21b815281906000906001600160a01b0383169063402c17949061020c9087906004016103d9565b60206040518083038186803b15801561022457600080fd5b505afa158015610238573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061025c9190610303565b90506000826001600160a01b03166308ae4b0c836040518263ffffffff1660e01b815260040161028c91906103d9565b60c06040518083038186803b1580156102a457600080fd5b505afa1580156102b8573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102dc919061035e565b50505050915050806000146101d45760405162461bcd60e51b81526004016100a090610419565b600060208284031215610314578081fd5b815161031f81610444565b9392505050565b60008060408385031215610338578081fd5b823561034381610444565b9150602083013561035381610444565b809150509250929050565b60008060008060008060c08789031215610376578182fd5b865161038181610444565b809650506020870151945060408701519350606087015180151581146103a5578283fd5b809350506080870151915060a087015190509295509295509295565b6000602082840312156103d2578081fd5b5035919050565b6001600160a01b0391909116815260200190565b6020808252601290820152711d1a5b595cdd185b5c081b9bdd081b59595d60721b604082015260600190565b60208082526011908201527024b9902737ba102230b79026b2b6b132b960791b604082015260600190565b6001600160a01b03811681146100a957600080fdfea2646970667358221220afd3e1f4ec64471e4f6405736e0a090af632fc1480a9806eaad346682cceed9864736f6c63430008000033";
