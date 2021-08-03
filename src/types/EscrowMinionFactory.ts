/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import { Contract, ContractFactory, Overrides } from "@ethersproject/contracts";

import type { EscrowMinion } from "./EscrowMinion";

export class EscrowMinionFactory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(overrides?: Overrides): Promise<EscrowMinion> {
    return super.deploy(overrides || {}) as Promise<EscrowMinion>;
  }
  getDeployTransaction(overrides?: Overrides): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): EscrowMinion {
    return super.attach(address) as EscrowMinion;
  }
  connect(signer: Signer): EscrowMinionFactory {
    return super.connect(signer) as EscrowMinionFactory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): EscrowMinion {
    return new Contract(address, _abi, signerOrProvider) as EscrowMinion;
  }
}

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "moloch",
        type: "address",
      },
    ],
    name: "ActionCanceled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "executor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "moloch",
        type: "address",
      },
    ],
    name: "ExecuteAction",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "proposer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "moloch",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address[]",
        name: "tokens",
        type: "address[]",
      },
      {
        indexed: false,
        internalType: "uint256[10]",
        name: "types",
        type: "uint256[10]",
      },
      {
        indexed: false,
        internalType: "uint256[10]",
        name: "tokenIds",
        type: "uint256[10]",
      },
      {
        indexed: false,
        internalType: "uint256[10]",
        name: "amounts",
        type: "uint256[10]",
      },
      {
        indexed: false,
        internalType: "address",
        name: "destinationVault",
        type: "address",
      },
    ],
    name: "ProposeAction",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "actions",
    outputs: [
      {
        internalType: "address",
        name: "vaultAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "proposer",
        type: "address",
      },
      {
        internalType: "address",
        name: "molochAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "executed",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_proposalId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "molochAddress",
        type: "address",
      },
    ],
    name: "cancelAction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "molochAddress",
        type: "address",
      },
    ],
    name: "executeAction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "onERC1155Received",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "onERC721Received",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "molochAddress",
        type: "address",
      },
      {
        internalType: "address[]",
        name: "tokenAddresses",
        type: "address[]",
      },
      {
        internalType: "uint256[3][]",
        name: "typesTokenIdsAmounts",
        type: "uint256[3][]",
      },
      {
        internalType: "address",
        name: "vaultAddress",
        type: "address",
      },
      {
        internalType: "uint256[3]",
        name: "requestSharesLootFunds",
        type: "uint256[3]",
      },
      {
        internalType: "string",
        name: "details",
        type: "string",
      },
    ],
    name: "proposeTribute",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "molochAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "newDestination",
        type: "address",
      },
      {
        internalType: "string",
        name: "details",
        type: "string",
      },
    ],
    name: "rescueTribute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5060016000556125df806100256000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c8063bfee4bba1161005b578063bfee4bba146101e9578063ef5ebd0814610215578063f23a6e611461027b578063f53bd01d1461030e5761007d565b8063150b7a021461008257806346a957e21461012d5780639a0251741461015b575b600080fd5b6101106004803603608081101561009857600080fd5b6001600160a01b03823581169260208101359091169160408201359190810190608081016060820135600160201b8111156100d257600080fd5b8201836020820111156100e457600080fd5b803590602001918460018302840111600160201b8311171561010557600080fd5b509092509050610453565b604080516001600160e01b03199092168252519081900360200190f35b6101596004803603604081101561014357600080fd5b50803590602001356001600160a01b031661047e565b005b6101596004803603608081101561017157600080fd5b8135916001600160a01b03602082013581169260408301359091169190810190608081016060820135600160201b8111156101ab57600080fd5b8201836020820111156101bd57600080fd5b803590602001918460018302840111600160201b831117156101de57600080fd5b5090925090506107f1565b610159600480360360408110156101ff57600080fd5b50803590602001356001600160a01b0316610cef565b6102416004803603604081101561022b57600080fd5b506001600160a01b038135169060200135611100565b604080516001600160a01b039687168152948616602086015292909416838301526060830152911515608082015290519081900360a00190f35b610110600480360360a081101561029157600080fd5b6001600160a01b03823581169260208101359091169160408201359160608101359181019060a081016080820135600160201b8111156102d057600080fd5b8201836020820111156102e257600080fd5b803590602001918460018302840111600160201b8311171561030357600080fd5b50909250905061114e565b610441600480360361010081101561032557600080fd5b6001600160a01b038235169190810190604081016020820135600160201b81111561034f57600080fd5b82018360208201111561036157600080fd5b803590602001918460208302840111600160201b8311171561038257600080fd5b919390929091602081019035600160201b81111561039f57600080fd5b8201836020820111156103b157600080fd5b803590602001918460608302840111600160201b831117156103d257600080fd5b919390926001600160a01b03833516926020810192919060a081019060800135600160201b81111561040357600080fd5b82018360208201111561041557600080fd5b803590602001918460018302840111600160201b8311171561043657600080fd5b50909250905061117a565b60408051918252519081900360200190f35b7f150b7a023d4804d13e8c85fb27262cb750cf6ba9f9dd3bb30d90f482ceeb4b1f5b95945050505050565b600260005414156104c4576040805162461bcd60e51b815260206004820152601f6024820152600080516020612532833981519152604482015290519081900360640190fd5b6002600055806104d2612312565b6001600160a01b0383166000908152600160209081526040808320878452825291829020825181546101009381028201840190945260e08101848152909391928492849184018282801561054f57602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610531575b5050505050815260200160018201805480602002602001604051908101604052809291908181526020016000905b828210156105ce576000848152602090206040805160608101918290529160038581029091019182845b8154815260200190600101908083116105a75750505050508152602001906001019061057d565b5050509082525060028201546001600160a01b03908116602083015260038301548116604083015260048301541660608201526005820154608082015260069091015460ff16151560a09091015260c081015190915015610668576040805162461bcd60e51b815260206004820152600f60248201526e1858dd1a5bdb88195e1958dd5d1959608a1b604482015290519081900360640190fd5b80606001516001600160a01b0316336001600160a01b0316146106c1576040805162461bcd60e51b815260206004820152600c60248201526b3737ba10383937b837b9b2b960a11b604482015290519081900360640190fd5b816001600160a01b031663e0a8f6f5856040518263ffffffff1660e01b815260040180828152602001915050600060405180830381600087803b15801561070757600080fd5b505af115801561071b573d6000803e3d6000fd5b5050506001600160a01b03841660009081526001602090815260408083208884529091528120915061074d828261234e565b61075b60018301600061236f565b506002810180546001600160a01b031990811690915560038201805482169055600482018054909116905560006005820155600601805460ff191690556107a3813033611504565b604080518581526001600160a01b038516602082015281517fdcccc5725b7256a6975da00de8953e5d326756a3079d203ff6df9e52331f411a929181900390910190a1505060016000555050565b60026000541415610837576040805162461bcd60e51b815260206004820152601f6024820152600080516020612532833981519152604482015290519081900360640190fd5b600260008190555060008490506000816001600160a01b031663c89039c56040518163ffffffff1660e01b815260040160206040518083038186803b15801561087f57600080fd5b505afa158015610893573d6000803e3d6000fd5b505050506040513d60208110156108a957600080fd5b505190506108b5612312565b6001600160a01b03871660009081526001602090815260408083208b8452825291829020825181546101009381028201840190945260e08101848152909391928492849184018282801561093257602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610914575b5050505050815260200160018201805480602002602001604051908101604052809291908181526020016000905b828210156109b1576000848152602090206040805160608101918290529160038581029091019182845b81548152602001906001019080831161098a57505050505081526020019060010190610960565b5050509082525060028201546001600160a01b03908116602083015260038301548116604083015260048301541660608201526005820154608082015260069091015460ff16151560a0909101529050610a09612390565b836001600160a01b031663b2643aab8a6040518263ffffffff1660e01b81526004018082815260200191505060c06040518083038186803b158015610a4d57600080fd5b505afa158015610a61573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525060c0811015610a8657600080fd5b5090506001600160a01b038716610ad9576040805162461bcd60e51b81526020600482015260126024820152711a5b9d985b1a59081c1c9bdc1bdcd85b125960721b604482015290519081900360640190fd5b8160c0015115610b22576040805162461bcd60e51b815260206004820152600f60248201526e1858dd1a5bdb88195e1958dd5d1959608a1b604482015290519081900360640190fd5b6020810151610b71576040805162461bcd60e51b81526020600482015260166024820152751c1c9bdc1bdcd85b081b9bdd081c1c9bd8d95cdcd95960521b604482015290519081900360640190fd5b606081015115610bbd576040805162461bcd60e51b81526020600482015260126024820152711c1c9bdc1bdcd85b0818d85b98d95b1b195960721b604482015290519081900360640190fd5b6000846001600160a01b031663590f940b3360008060008960008b8f8f6040518a63ffffffff1660e01b8152600401808a6001600160a01b03168152602001898152602001888152602001878152602001866001600160a01b03168152602001858152602001846001600160a01b03168152602001806020018281038252848482818152602001925080828437600081840152601f19601f8201169050808301925050509a5050505050505050505050602060405180830381600087803b158015610c8757600080fd5b505af1158015610c9b573d6000803e3d6000fd5b505050506040513d6020811015610cb157600080fd5b50519050610cbd612312565b610cd28a856000015186602001518c86611adc565b9050610cdd81611bf2565b50506001600055505050505050505050565b60026000541415610d35576040805162461bcd60e51b815260206004820152601f6024820152600080516020612532833981519152604482015290519081900360640190fd5b600260005580610d43612312565b6001600160a01b0383166000908152600160209081526040808320878452825291829020825181546101009381028201840190945260e081018481529093919284928491840182828015610dc057602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610da2575b5050505050815260200160018201805480602002602001604051908101604052809291908181526020016000905b82821015610e3f576000848152602090206040805160608101918290529160038581029091019182845b815481526020019060010190808311610e1857505050505081526020019060010190610dee565b5050509082525060028201546001600160a01b03908116602083015260038301548116604083015260048301541660608201526005820154608082015260069091015460ff16151560a0909101529050610e97612390565b826001600160a01b031663b2643aab866040518263ffffffff1660e01b81526004018082815260200191505060c06040518083038186803b158015610edb57600080fd5b505afa158015610eef573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525060c0811015610f1457600080fd5b5060408301519091506001600160a01b0316610f6c576040805162461bcd60e51b81526020600482015260126024820152711a5b9d985b1a59081c1c9bdc1bdcd85b125960721b604482015290519081900360640190fd5b8160c0015115610fb5576040805162461bcd60e51b815260206004820152600f60248201526e1858dd1a5bdb88195e1958dd5d1959608a1b604482015290519081900360640190fd5b6020810151611004576040805162461bcd60e51b81526020600482015260166024820152751c1c9bdc1bdcd85b081b9bdd081c1c9bd8d95cdcd95960521b604482015290519081900360640190fd5b606081015115611050576040805162461bcd60e51b81526020600482015260126024820152711c1c9bdc1bdcd85b0818d85b98d95b1b195960721b604482015290519081900360640190fd5b6040810151600090156110685750604082015161106f565b5060608201515b6001600160a01b03851660009081526001602081815260408084208a8552909152909120600601805460ff191690911790556110ac833083611504565b604080518781523360208201526001600160a01b0387168183015290517f96092b4b65f0f87b0be3b57295b8c29c02b88192c09ae2303b2993a729db17299181900360600190a15050600160005550505050565b6001602090815260009283526040808420909152908252902060028101546003820154600483015460058401546006909401546001600160a01b039384169492841693909116919060ff1685565b7ff23a6e612e1ff4830e658fe43f4e3cb4a5f8170bd5d9e69fb5d7a7fa9e4fdf975b9695505050505050565b6000600260005414156111c2576040805162461bcd60e51b815260206004820152601f6024820152600080516020612532833981519152604482015290519081900360640190fd5b600260008190555060008a90506000816001600160a01b031663c89039c56040518163ffffffff1660e01b815260040160206040518083038186803b15801561120a57600080fd5b505afa15801561121e573d6000803e3d6000fd5b505050506040513d602081101561123457600080fd5b505190506001600160a01b03871661128a576040805162461bcd60e51b8152602060048201526014602482015273696e76616c6964207661756c744164647265737360601b604482015290519081900360640190fd5b878a146112cd576040805162461bcd60e51b815260206004820152600c60248201526b042e6c2daca5ad8cadccee8d60a31b604482015290519081900360640190fd5b600a881115611311576040805162461bcd60e51b815260206004820152600b60248201526a042dac2f05ad8cadccee8d60ab1b604482015290519081900360640190fd5b60006001600160a01b03831663590f940b33898460200201358a600160200201356000878d60026020020135898e8e6040518a63ffffffff1660e01b8152600401808a6001600160a01b03168152602001898152602001888152602001878152602001866001600160a01b03168152602001858152602001846001600160a01b03168152602001806020018281038252848482818152602001925080828437600081840152601f19601f8201169050808301925050509a5050505050505050505050602060405180830381600087803b1580156113ed57600080fd5b505af1158015611401573d6000803e3d6000fd5b505050506040513d602081101561141757600080fd5b50519050611423612312565b6114d88e8e8e80806020026020016040519081016040528093929190818152602001838360200280828437600081840152601f19601f820116905080830192505050505050508d8d808060200260200160405190810160405280939291908181526020016000905b828210156114cc576040805160608181019092529080840287019060039083908390808284376000920191909152505050815260019091019060200161148b565b50505050508c86611adc565b90506114e381611bf2565b6114ee813330611504565b5060016000559c9b505050505050505050505050565b60008060005b856020015151811015611ad45760018660200151828151811061152957fe5b602002602001015160006003811061153d57fe5b602002015114156116e6578115801561155e57506001600160a01b03841630145b1561161c5761158430308860400151600060405180602001604052806000815250611e26565b6115bf576040805162461bcd60e51b81526020600482015260076024820152662145524337323160c81b604482015290519081900360640190fd5b6115dc303033600060405180602001604052806000815250611e26565b611617576040805162461bcd60e51b81526020600482015260076024820152662145524337323160c81b604482015290519081900360640190fd5b600191505b60008660000151828151811061162e57fe5b60200260200101519050806001600160a01b03166342842e0e87878a60200151868151811061165957fe5b602002602001015160016003811061166d57fe5b60200201516040518463ffffffff1660e01b815260040180846001600160a01b03168152602001836001600160a01b031681526020018281526020019350505050600060405180830381600087803b1580156116c857600080fd5b505af11580156116dc573d6000803e3d6000fd5b5050505050611acc565b6000866020015182815181106116f857fe5b602002602001015160006003811061170c57fe5b602002015114156118c15760008660000151828151811061172957fe5b60200260200101519050306001600160a01b0316866001600160a01b031614156117fe57806001600160a01b031663a9059cbb868960200151858151811061176d57fe5b602002602001015160026003811061178157fe5b60200201516040518363ffffffff1660e01b815260040180836001600160a01b0316815260200182815260200192505050602060405180830381600087803b1580156117cc57600080fd5b505af11580156117e0573d6000803e3d6000fd5b505050506040513d60208110156117f657600080fd5b506118bb9050565b806001600160a01b03166323b872dd87878a60200151868151811061181f57fe5b602002602001015160026003811061183357fe5b60200201516040518463ffffffff1660e01b815260040180846001600160a01b03168152602001836001600160a01b031681526020018281526020019350505050602060405180830381600087803b15801561188e57600080fd5b505af11580156118a2573d6000803e3d6000fd5b505050506040513d60208110156118b857600080fd5b50505b50611acc565b6002866020015182815181106118d357fe5b60200260200101516000600381106118e757fe5b60200201511415611acc578215801561190857506001600160a01b03841630145b156119ca5761192f3030886040015160008060405180602001604052806000815250611f88565b61196b576040805162461bcd60e51b8152602060048201526008602482015267214552433131353560c01b604482015290519081900360640190fd5b61198930303360008060405180602001604052806000815250611f88565b6119c5576040805162461bcd60e51b8152602060048201526008602482015267214552433131353560c01b604482015290519081900360640190fd5b600192505b6000866000015182815181106119dc57fe5b60200260200101519050806001600160a01b031663f242432a87878a602001518681518110611a0757fe5b6020026020010151600160038110611a1b57fe5b60200201518b602001518781518110611a3057fe5b6020026020010151600260038110611a4457fe5b6020020151604080516001600160e01b031960e088901b1681526001600160a01b0395861660048201529390941660248401526044830191909152606482015260a06084820152600060a48201819052915160e4808301939282900301818387803b158015611ab257600080fd5b505af1158015611ac6573d6000803e3d6000fd5b50505050505b60010161150a565b505050505050565b611ae4612312565b611aec612312565b506040805160e08101825286815260208082018790526001600160a01b038087168385015233606084015289166080830181905260a08301869052600060c08401819052908152600182528381208682528252929092208151805192938493611b5892849201906123ae565b506020828101518051611b719260018501920190612413565b5060408201516002820180546001600160a01b03199081166001600160a01b0393841617909155606084015160038401805483169184169190911790556080840151600484018054909216921691909117905560a0820151600582015560c0909101516006909101805460ff19169115159190911790559695505050505050565b611bfa612469565b611c02612469565b611c0a612469565b60005b846020015151811015611cd85784602001518181518110611c2a57fe5b6020026020010151600060038110611c3e57fe5b60200201518482600a8110611c4f57fe5b60200201818152505084602001518181518110611c6857fe5b6020026020010151600160038110611c7c57fe5b60200201518382600a8110611c8d57fe5b60200201818152505084602001518181518110611ca657fe5b6020026020010151600260038110611cba57fe5b60200201518282600a8110611ccb57fe5b6020020152600101611c0d565b507fc077724b1fef738795ca4156e424577a9dff27118fcb186130d0379799aae3ab8460a0015133866080015187600001518787878b6040015160405180898152602001886001600160a01b03168152602001876001600160a01b031681526020018060200186600a60200280838360005b83811015611d62578181015183820152602001611d4a565b5050505090500185600a60200280838360005b83811015611d8d578181015183820152602001611d75565b5050505090500184600a60200280838360005b83811015611db8578181015183820152602001611da0565b50505050905001836001600160a01b03168152602001828103825287818151815260200191508051906020019060200280838360005b83811015611e06578181015183820152602001611dee565b50505050905001995050505050505050505060405180910390a150505050565b6000611e3a846001600160a01b03166120f3565b611e4657506001610475565b6060611f4d63150b7a0260e01b8888878760405160240180856001600160a01b03168152602001846001600160a01b0316815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b83811015611ebb578181015183820152602001611ea3565b50505050905090810190601f168015611ee85780820380516001836020036101000a031916815260200191505b5095505050505050604051602081830303815290604052906001600160e01b0319166020820180516001600160e01b038381831617835250505050604051806060016040528060328152602001612552603291396001600160a01b03881691906120f9565b90506000818060200190516020811015611f6657600080fd5b50516001600160e01b031916630a85bd0160e11b149250505095945050505050565b6000611f9c856001600160a01b03166120f3565b611fa857506001611170565b60606120b763f23a6e6160e01b898988888860405160240180866001600160a01b03168152602001856001600160a01b0316815260200184815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b8381101561202457818101518382015260200161200c565b50505050905090810190601f1680156120515780820380516001836020036101000a031916815260200191505b509650505050505050604051602081830303815290604052906001600160e01b0319166020820180516001600160e01b0383818316178352505050506040518060600160405280603481526020016124fe603491396001600160a01b03891691906120f9565b905060008180602001905160208110156120d057600080fd5b50516001600160e01b03191663f23a6e6160e01b14925050509695505050505050565b3b151590565b60606121088484600085612112565b90505b9392505050565b6060824710156121535760405162461bcd60e51b81526004018080602001828103825260268152602001806125846026913960400191505060405180910390fd5b61215c856120f3565b6121ad576040805162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e7472616374000000604482015290519081900360640190fd5b60006060866001600160a01b031685876040518082805190602001908083835b602083106121ec5780518252601f1990920191602091820191016121cd565b6001836020036101000a03801982511681845116808217855250505050505090500191505060006040518083038185875af1925050503d806000811461224e576040519150601f19603f3d011682016040523d82523d6000602084013e612253565b606091505b509150915061226382828661226e565b979650505050505050565b6060831561227d57508161210b565b82511561228d5782518084602001fd5b8160405162461bcd60e51b81526004018080602001828103825283818151815260200191508051906020019080838360005b838110156122d75781810151838201526020016122bf565b50505050905090810190601f1680156123045780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b6040805160e081018252606080825260208201819052600092820183905281018290526080810182905260a0810182905260c081019190915290565b508054600082559060005260206000209081019061236c9190612488565b50565b508054600082556003029060005260206000209081019061236c919061249d565b6040518060c001604052806006906020820280368337509192915050565b828054828255906000526020600020908101928215612403579160200282015b8281111561240357825182546001600160a01b0319166001600160a01b039091161782556020909201916001909101906123ce565b5061240f929150612488565b5090565b82805482825590600052602060002090600302810192821561245d579160200282015b8281111561245d57825161244d90839060036124ba565b5091602001919060030190612436565b5061240f92915061249d565b604051806101400160405280600a906020820280368337509192915050565b5b8082111561240f5760008155600101612489565b8082111561240f5760006124b182826124e8565b5060030161249d565b8260038101928215612403579160200282015b828111156124035782518255916020019190600101906124cd565b5060008155600101600081556001016000905556fe455243313135353a207472616e7366657220746f206e6f6e2045524331313535526563656976657220696d706c656d656e7465725265656e7472616e637947756172643a207265656e7472616e742063616c6c004552433732313a207472616e7366657220746f206e6f6e20455243373231526563656976657220696d706c656d656e746572416464726573733a20696e73756666696369656e742062616c616e636520666f722063616c6ca2646970667358221220161a8fcd8db2bab7cc1c13c7fd2e067cee2d06b98a64e658c6b3e08ec42b042b64736f6c63430007050033";
