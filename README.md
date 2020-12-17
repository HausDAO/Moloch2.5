# MinionSummoner
Summon All the Minions

## Summoning 
Summon a minion for your DAO, give it a name, just 'cause this is a vanilla minion (the OG) doesn't mean it doesn't deserve some spice. 

Summoning a minion is easy. The only arguments the summon function takes are the address of the moloch it will minion for (e.g. it's parent DAO) and a description, which can be a name or other description for this minion's purpose. The summon function emits a SummonMinion event where you can grab the new minion's address.

Details of summoned minions can be looked up in the minions mapping, which will allow you to search by minion address and retrieve information about the minion's description and the Moloch it serves. 

## Using your minion 

Minion is meant for submitting proposals to DAOs for arbitrary contract calls (i.e. minion proposals allow the DAO to submit proposals that will allow it to interact with other smart contracts). The way to use a minion is to submit the proposal with all the normal fields plus the byte data you want to send to the other contract's function. One way to get this byte data is by pretending to interact with the target function using MetaMask and then clicking on the data tab and copying and pasting the Hex data into the byte data field for a minion proposal--there are also other ways of getting the necessary byte data that are slightly more advanced. 

Once your minion proposal has passed in the DAO you can call the executeAction function. The executeAction function just takes the proposalId to make the desired contract interaction happen. 

The doWithdraw function allows the minion to collect any funds waiting for the minion in its parent DAO. The doWithdraw function takes the token and amount as its arguments. 

Other features of the vanilla minion are the ability to withdraw funds and cancel proposals. 

The crossWithdraw function means that you can either draw funds from any Moloch into the minion (when transfer is set to false) or directly into the parent moloch (when transfer is set to true). The crossWithdraw function just takes a target address, a token address, an amount, and a true / false on that transfer option mentioned above. The crossWithdraw can only pull tokens directly into its parent DAO if the tokens have already been whitelisted. 

The cancelProposal function allows an proposer to cancel the proposal they submitted. This function just takes the proposalId of the proposal they submitted. The cancelProposal function must be called prior to the proposal being sponsored in the parent moloch. 

## Deployments

xDAI - 0x9610389d548Ca0224aCaC40eB3241c5ED88D2479

kovan - 0x80ec2dB292E7a6D1D5bECB80e6479b2bE048AC98

rinkeby - 0x316eFCd421b0654B7aE8E806880D4AE88ecaE206
