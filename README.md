# MinionSummoner
Summon All the Minions

Summon a minion for your DAO, give it a name, just 'cause this is a vanilla minion (the OG) doesn't mean it doesn't deserve some spice. 

Minion is meant for submitting proposals to DAOs for arbitrary contract calls (i.e. minion proposals allow the DAO to submit proposals that will allow it to interact with other smart contracts). The way to use a minion is to submit the proposal with all the normal fields plus the byte data you want to send to the other contract's function. One way to get this byte data is by pretending to interact with the target function using MetaMask and then clicking on the data tab and copying and pasting the Hex data into the byte data field for a minion proposal--there are also other ways of getting the necessary byte data that are slightly more advanced. 

Once your minion proposal has passed in the DAO you can call the executeAction function. The executeAction function just takes the proposalId to make the desired contract interaction happen. 

The doWithdraw function allows the minion to collect any funds waiting for the minion in its parent DAO. The doWithdraw function takes the token and amount as its arguments. 

Other feature of the vanilla minion is the ability to withdraw funds directly one DAO into another (or the minion) using crossWithdraw. This function means that you can either draw funds from any Moloch into the minion (when transfer is set to false) or directly into the parent moloch (when transfer is set to true). The crossWithdraw function just takes a target address, a token address, an amount, and a true / false on that transfer option mentioned above. The crossWithdraw can only pull tokens directly into its parent DAO if the tokens have already been whitelisted.  
