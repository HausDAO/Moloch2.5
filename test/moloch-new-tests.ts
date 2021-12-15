import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { use, expect } from "chai";
import { ContractFactory } from "@ethersproject/contracts";
import { Moloch } from "../src/types/Moloch";
import { MolochSummoner } from "../src/types/MolochSummoner";
import { AnyErc20 } from "../src/types/AnyErc20";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

use(solidity);

describe.only("Moloch Yeeter Summoner", function () {
  let Moloch: ContractFactory;
  let moloch: Moloch;
  let MolochSummoner: ContractFactory;
  let molochSummoner: MolochSummoner;
  let AnyERC20: ContractFactory;
  let anyErc20: AnyErc20;

  let signers: SignerWithAddress[];
  let summoner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let molochContract: Moloch;

  async function blockTime() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }

  async function snapshot() {
    return ethers.provider.send("evm_snapshot", []);
  }

  async function restore(snapshotId: String) {
    return ethers.provider.send("evm_revert", [snapshotId]);
  }

  async function forceMine() {
    return ethers.provider.send("evm_mine", []);
  }

  const deploymentConfig = {
    PERIOD_DURATION_IN_SECONDS: 17280,
    VOTING_DURATON_IN_PERIODS: 35,
    GRACE_DURATON_IN_PERIODS: 35,
    PROPOSAL_DEPOSIT: 10,
    DILUTION_BOUND: 3,
    PROCESSING_REWARD: 1,
    TOKEN_SUPPLY: 10000,
  };

  async function moveForwardPeriods(periods: number) {
    await blockTime();
    const goToTime = deploymentConfig.PERIOD_DURATION_IN_SECONDS * periods;
    await ethers.provider.send("evm_increaseTime", [goToTime]);
    await forceMine();
    await blockTime();
    return true;
  }

  beforeEach("deploy contracts", async () => {
    signers = await ethers.getSigners();
    summoner = signers[0];
    addr1 = signers[1];
    addr2 = signers[2];

    Moloch = await ethers.getContractFactory("Moloch");
    MolochSummoner = await ethers.getContractFactory("MolochSummoner");
    AnyERC20 = await ethers.getContractFactory('AnyERC20')

    moloch = (await Moloch.deploy()) as Moloch;
    molochSummoner = (await MolochSummoner.deploy(
      moloch.address
    )) as MolochSummoner;
    anyErc20 = (await AnyERC20.deploy()) as AnyErc20;
    const sum = await molochSummoner.summonMoloch(
        summoner.address,
        summoner.address,
        [anyErc20.address],
        deploymentConfig.PERIOD_DURATION_IN_SECONDS,
        deploymentConfig.VOTING_DURATON_IN_PERIODS,
        deploymentConfig.GRACE_DURATON_IN_PERIODS,
        deploymentConfig.PROPOSAL_DEPOSIT,
        deploymentConfig.DILUTION_BOUND,
        deploymentConfig.PROCESSING_REWARD
      );
      const idx = await molochSummoner.daoIdx();
      const newMoloch = await molochSummoner.daos(idx);
      molochContract = (await Moloch.attach(newMoloch)) as Moloch;
      const depositTokenAddress = await molochContract.depositToken();
  
      expect(depositTokenAddress).to.equal(anyErc20.address);


  });

  it("should deploy a new moloch", async function () {
    


  });

  it('verify deployment parameters', async () => {
    // eslint-disable-next-line no-unused-vars
    const now = await blockTime()

    const proposalCount = await molochContract.proposalCount()
    expect(proposalCount).to.equal(0);

    const periodDuration = await molochContract.periodDuration()
    expect(+periodDuration).to.equal(deploymentConfig.PERIOD_DURATION_IN_SECONDS)

    const votingPeriodLength = await molochContract.votingPeriodLength()
    expect(+votingPeriodLength).to.equal(deploymentConfig.VOTING_DURATON_IN_PERIODS)

    const gracePeriodLength = await molochContract.gracePeriodLength()
    expect(+gracePeriodLength).to.equal(deploymentConfig.GRACE_DURATON_IN_PERIODS)

    const proposalDeposit = await molochContract.proposalDeposit()
    expect(+proposalDeposit).to.equal(deploymentConfig.PROPOSAL_DEPOSIT)

    const dilutionBound = await molochContract.dilutionBound()
    expect(+dilutionBound).to.equal(deploymentConfig.DILUTION_BOUND)

    const processingReward = await molochContract.processingReward()
    expect(+processingReward).to.equal(deploymentConfig.PROCESSING_REWARD)

    const currentPeriod = await molochContract.getCurrentPeriod()
    expect(+currentPeriod).to.equal(0)

    const summonerData = await molochContract.members(summoner.address)
    expect(summonerData.delegateKey).to.equal(summoner.address) // delegateKey matches
    // expect(summonerData.shares).to.equal(summonerShares)
    expect(summonerData.exists).to.equal(true)
    expect(summonerData.highestIndexYesVote).to.equal(0)

    const summonerAddressByDelegateKey = await molochContract.memberAddressByDelegateKey(summoner.address)
    expect(summonerAddressByDelegateKey).to.equal(summoner.address)

    const totalShares = await molochContract.totalShares()
    expect(+totalShares).to.equal(1)

    const totalLoot = await molochContract.totalLoot()
    expect(+totalLoot).to.equal(0)

    const totalGuildBankTokens = await molochContract.totalGuildBankTokens()
    expect(+totalGuildBankTokens).to.equal(0)

    // confirm initial deposit token supply and summoner balance
    // const tokenSupply = await tokenAlpha.totalSupply()
    // expect(+tokenSupply.toString()).to.equal(deploymentConfig.TOKEN_SUPPLY)
    // const summonerBalance = await tokenAlpha.balanceOf(summoner)
    // expect(+summonerBalance.toString()).to.equal(initSummonerBalance)
    // const creatorBalance = await tokenAlpha.balanceOf(creator)
    // expect(creatorBalance).to.equal( deploymentConfig.TOKEN_SUPPLY - initSummonerBalance)

    // check all tokens passed in construction are approved
    // const tokenAlphaApproved = await molochContract.tokenWhitelist(anyErc20.address)
    // expect(tokenAlphaApproved, true)

    // first token should be the deposit token
    const firstWhitelistedToken = await molochContract.approvedTokens(0)
    //expect(firstWhitelistedToken, depositToken.address)
    expect(firstWhitelistedToken).to.equal( anyErc20.address)
  })

  afterEach(async () => {});
});
