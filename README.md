
# Moloch V2.5
Summon All the Minions

## Deployments

Rinkeby: 

Kovan: 

Mainnet: 

Polygon: 

xDai: 

## Documetation is still WIP

### Dao-Safe-Minion Summoner

This pattern combines the work in the MinionSummonerV2 with a updated MolochV2 contract that allows the Minion to update the dao config/shares/loot. This uses a concept of a shaman ( a shaman has admin rights of some of the dao config through onlyShaman modifier)

### Moloch v2.5 change log
only shaman functions
* setSharesLoot
* setConfig
* setShaman

new events
* Shaman
* SetSpamPrevention
* SetConfig
* SetShaman

changes to init
* summoner and multi summoner removed. THis is set by a shaman now

### Factory Pattern

The dao, minion and safe are summoned in the factory. Initially the dao has no members so is inactive, this allows the summoner (msg.sender) to have an opurtunity to summon and configure any Shamans and then multi summon any initial members with shares and loot.

* Summmon DAO, Minion and safe. Factory is set as a temporary shaman. 
* Deploy and configure any initial shamans.
* Summoner can finish setup of the dao by adding any initial shamans and members. (one time setup, only by summoner from the factory, summoner alwyas gets 1 share)
* setup will configure the deployed minion to be a shaman (MinionShaman) and the temporary factory shaman is disabled.

### Shamans
Shamans are very flexible and have many use cases. Because they are so powerful, they could really bork things up, so be careful!

#### Current Examples 
* [**Yeeter.sol**](contracts/Yeeter.sol) is an example of a Shaman. With the yeeter someone could send a native token to an address and receive loot in return.
* **Shaman Minion**: A minion can be used to make proposals to alter the shares directly.

#### Other Shaman Ideas

* **erc20 yeeter**: same as the above yeeter, but with erc20 tokens
* **splitter**: tokens/coins sent to shaman, which mints shares or loot for multiple recipients
* **token grapling**: A token (erc20 or 721) transfer hooks could be used to alter the shares, making shares transferable
* **sword of Damocles**: convert all members' shares to loot if some external condition is triggered (or not met by a certain time)
* **commitment**: member can commit to something by "staking" their shares or loot. If they don't fulfill their commitment, their "staked" shares or loot get burned (or converted to loot).
    - eg, accountability for members who have been delegated executive power over some funds or other DAO resources
* **schelling votes**: penalize members who vote against the majority on a given proposal
* **NFT staking**: mint shares for addresses that stake a particular NFT
* **erc20 staking**: mint shares for addresses that stake a particular token
    - might not be any different from backing shares with a tribute to the treasury
* **vote participation incentives**: mint shares to members who vote on proposals
* **brightID**: add verified human requirement to other shamans
* **coordinape**: auto-mint shares or loot for coordinape epoch recipients
    - prereq: the coordinape mechanism must be on chain
    - forwards tokens (eg HAUS) to treasury and mints shares proportionally to recipients 
* **sourcecred**: similar to coordinape Shaman, but for sourcecred-based distributions
* **DAO cloner**: make a full copy of an existing DAO, perhaps triggered by transfer of treasury assets
* **algorithmic stable shares**: 

## Credits

Based on the original work done by RaidGuild at [Moloch-Minion](https://github.com/raid-guild/moloch-minion/)

Moloch2.5 is an update to Moloch V2 contracts by MolochVentures [Moloch](https://github.com/MolochVentures/moloch)

