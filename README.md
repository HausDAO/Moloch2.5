
# Moloch V2.5
Summon All the Minions

## Safe Minion Deployments

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

### Usecases
Shamans are very flexible and have many usecases. Because they are so powerfull they could really bork things up. so becareful
* Yeeter.sol is an example of a shaman. With the yeeter someone could send a native token to an address and receive loot in return.
## Credits

Based on the original work done by RaidGuild at [Moloch-Minion](https://github.com/raid-guild/moloch-minion/)

Moloch2.5 is an update to Moloch V2 contracts by MolochVentures [Moloch](https://github.com/MolochVentures/moloch)

