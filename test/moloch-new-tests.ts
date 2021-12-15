import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { use, expect, assert } from "chai";
import { ContractFactory } from "@ethersproject/contracts";
import { Moloch } from "../src/types/Moloch";
import { MolochSummoner } from "../src/types/MolochSummoner";
import { AnyErc20 } from "../src/types/AnyErc20";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "@ethersproject/bignumber";

use(solidity);

const BN = ethers.BigNumber

const revertMessages = {
  molochConstructorSummonerCannotBe0: "summoner cannot be 0",
  molochConstructorPeriodDurationCannotBe0: "_periodDuration cannot be 0",
  molochConstructorVotingPeriodLengthCannotBe0:
    "_votingPeriodLength cannot be 0",
  molochConstructorVotingPeriodLengthExceedsLimit:
    "_votingPeriodLength exceeds limit",
  molochConstructorGracePeriodLengthExceedsLimit:
    "_gracePeriodLength exceeds limit",
  molochConstructorDilutionBoundCannotBe0: "_dilutionBound cannot be 0",
  molochConstructorDilutionBoundExceedsLimit: "_dilutionBound exceeds limit",
  molochConstructorNeedAtLeastOneApprovedToken:
    "need at least one approved token",
  molochConstructorTooManyTokens: "too many tokens",
  molochConstructorDepositCannotBeSmallerThanProcessingReward:
    "_proposalDeposit cannot be smaller than _processingReward",
  molochConstructorApprovedTokenCannotBe0: "_approvedToken cannot be 0",
  molochConstructorDuplicateApprovedToken: "duplicate approved token",
  submitProposalTooManySharesRequested: "too many shares requested",
  submitProposalProposalMustHaveBeenProposed:
    "proposal must have been proposed",
  submitProposalTributeTokenIsNotWhitelisted: "tributeToken is not whitelisted",
  submitProposalPaymetTokenIsNotWhitelisted: "payment is not whitelisted",
  submitProposalApplicantCannotBe0: "revert applicant cannot be 0",
  submitProposalApplicantCannotBeReserved:
    "applicant address cannot be reserved",
  submitProposalApplicantIsJailed: "proposal applicant must not be jailed",
  submitWhitelistProposalMustProvideTokenAddress: "must provide token address",
  submitWhitelistProposalAlreadyHaveWhitelistedToken:
    "cannot already have whitelisted the token",
  submitGuildKickProposalMemberMustHaveAtLeastOneShare:
    "member must have at least one share or one loot",
  submitGuildKickProposalMemberMustNotBeJailed:
    "member must not already be jailed",
  sponsorProposalProposalHasAlreadyBeenSponsored:
    "proposal has already been sponsored",
  sponsorProposalProposalHasAlreadyBeenCancelled:
    "proposal has already been cancelled",
  sponsorProposalAlreadyProposedToWhitelist: "already proposed to whitelist",
  sponsorProposalAlreadyWhitelisted:
    "cannot already have whitelisted the token",
  sponsorProposalAlreadyProposedToKick: "already proposed to kick",
  sponsorProposalApplicantIsJailed: "proposal applicant must not be jailed",
  submitVoteProposalDoesNotExist: "proposal does not exist",
  submitVoteMustBeLessThan3: "must be less than 3",
  submitVoteVotingPeriodHasNotStarted: "voting period has not started",
  submitVoteVotingPeriodHasExpired: "voting period has expired",
  submitVoteMemberHasAlreadyVoted: "member has already voted",
  submitVoteVoteMustBeEitherYesOrNo: "vote must be either Yes or No",
  cancelProposalProposalHasAlreadyBeenSponsored:
    "proposal has already been sponsored",
  cancelProposalSolelyTheProposerCanCancel: "solely the proposer can cancel",
  processProposalProposalDoesNotExist: "proposal does not exist",
  processProposalProposalIsNotReadyToBeProcessed:
    "proposal is not ready to be processed",
  processProposalProposalHasAlreadyBeenProcessed:
    "proposal has already been processed",
  processProposalPreviousProposalMustBeProcessed:
    "previous proposal must be processed",
  processProposalMustBeAStandardProposal: "must be a standard proposal",
  processWhitelistProposalMustBeAWhitelistProposal:
    "must be a whitelist proposal",
  processGuildKickProposalMustBeAGuildKickProposal:
    "must be a guild kick proposal",
  notAMember: "not a member",
  notAShareholder: "not a shareholder",
  rageQuitInsufficientShares: "insufficient shares",
  rageQuitInsufficientLoot: "insufficient loot",
  rageQuitUntilHighestIndex:
    "cannot ragequit until highest index proposal member voted YES on is processed",
  withdrawBalanceInsufficientBalance: "insufficient balance",
  updateDelegateKeyNewDelegateKeyCannotBe0: "newDelegateKey cannot be 0",
  updateDelegateKeyCantOverwriteExistingMembers:
    "cannot overwrite existing members",
  updateDelegateKeyCantOverwriteExistingDelegateKeys:
    "cannot overwrite existing delegate keys",
  canRageQuitProposalDoesNotExist: "proposal does not exist",
  ragekickMustBeInJail: "member must be in jail",
  ragekickMustHaveSomeLoot: "member must have some loot",
  ragekickPendingProposals:
    "cannot ragequit until highest index proposal member voted YES on is processed",
  getMemberProposalVoteMemberDoesntExist: "member does not exist",
  getMemberProposalVoteProposalDoesntExist: "proposal does not exist",
  molochConstructorDilutionBoundExceedsLimitExceedsLimit: "",
};

const SolRevert = "VM Exception while processing transaction: revert";

const zeroAddress = "0x0000000000000000000000000000000000000000";
const GUILD = "0x000000000000000000000000000000000000dead";
const ESCROW = "0x000000000000000000000000000000000000beef";
const TOTAL = "0x000000000000000000000000000000000000babe";
const MAX_TOKEN_WHITELIST_COUNT = BN.from("400");

const _1 = BN.from("1");
const _1e18 = BN.from("1000000000000000000"); // 1e18
const _1e18Plus1 = _1e18.add(_1);
const _1e18Minus1 = _1e18.sub(_1);

function addressArray(length: BigNumberish) {
  // returns an array of distinct non-zero addresses
  let array = [];
  for (let i = 1; i <= length; i++) {
    array.push("0x" + (i).toString(16).padStart(40, '0'));
  }
  return array;
}

describe.only("Moloch DAO Summoner", function () {
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
    AnyERC20 = await ethers.getContractFactory("AnyERC20");

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

    await anyErc20.mint(summoner.address, deploymentConfig.TOKEN_SUPPLY);
  });

  it("should deploy a new moloch", async function () {});

  it("verify deployment parameters", async () => {
    // eslint-disable-next-line no-unused-vars
    const now = await blockTime();

    const proposalCount = await molochContract.proposalCount();
    expect(proposalCount).to.equal(0);

    const periodDuration = await molochContract.periodDuration();
    expect(+periodDuration).to.equal(
      deploymentConfig.PERIOD_DURATION_IN_SECONDS
    );

    const votingPeriodLength = await molochContract.votingPeriodLength();
    expect(+votingPeriodLength).to.equal(
      deploymentConfig.VOTING_DURATON_IN_PERIODS
    );

    const gracePeriodLength = await molochContract.gracePeriodLength();
    expect(+gracePeriodLength).to.equal(
      deploymentConfig.GRACE_DURATON_IN_PERIODS
    );

    const proposalDeposit = await molochContract.proposalDeposit();
    expect(+proposalDeposit).to.equal(deploymentConfig.PROPOSAL_DEPOSIT);

    const dilutionBound = await molochContract.dilutionBound();
    expect(+dilutionBound).to.equal(deploymentConfig.DILUTION_BOUND);

    const processingReward = await molochContract.processingReward();
    expect(+processingReward).to.equal(deploymentConfig.PROCESSING_REWARD);

    const currentPeriod = await molochContract.getCurrentPeriod();
    expect(+currentPeriod).to.equal(0);

    const summonerData = await molochContract.members(summoner.address);
    expect(summonerData.delegateKey).to.equal(summoner.address); // delegateKey matches
    // expect(summonerData.shares).to.equal(summonerShares)
    expect(summonerData.exists).to.equal(true);
    expect(summonerData.highestIndexYesVote).to.equal(0);

    const summonerAddressByDelegateKey =
      await molochContract.memberAddressByDelegateKey(summoner.address);
    expect(summonerAddressByDelegateKey).to.equal(summoner.address);

    const totalShares = await molochContract.totalShares();
    expect(+totalShares).to.equal(1);

    const totalLoot = await molochContract.totalLoot();
    expect(+totalLoot).to.equal(0);

    const totalGuildBankTokens = await molochContract.totalGuildBankTokens();
    expect(+totalGuildBankTokens).to.equal(0);

    // confirm initial deposit token supply and summoner balance
    const tokenSupply = await anyErc20.totalSupply();
    expect(+tokenSupply.toString()).to.equal(deploymentConfig.TOKEN_SUPPLY);
    const summonerBalance = await anyErc20.balanceOf(summoner.address);
    expect(+summonerBalance.toString()).to.equal(deploymentConfig.TOKEN_SUPPLY);
    //expect(+summonerBalance.toString()).to.equal(initSummonerBalance)
    // const creatorBalance = await tokenAlpha.balanceOf(creator)
    // expect(creatorBalance).to.equal( deploymentConfig.TOKEN_SUPPLY - initSummonerBalance)

    // check all tokens passed in construction are approved
    const tokenAlphaApproved = await molochContract.tokenWhitelist(
      anyErc20.address
    );
    assert(tokenAlphaApproved, "true");

    // first token should be the deposit token
    const firstWhitelistedToken = await molochContract.approvedTokens(0);
    //expect(firstWhitelistedToken, depositToken.address)
    expect(firstWhitelistedToken).to.equal(anyErc20.address);
  });

  it("require fail - summoner can not be zero address", async () => {
      
    const sum = molochSummoner.summonMoloch(
        zeroAddress,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );

    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorSummonerCannotBe0
    );
  });

  it("require fail - period duration can not be zero", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      0,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorPeriodDurationCannotBe0
    );
  });

  it("require fail - voting period can not be zero", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      0,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorVotingPeriodLengthCannotBe0
    );
  });

  it("require fail - voting period exceeds limit", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      _1e18Plus1,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorVotingPeriodLengthExceedsLimit
    );

    // still works with 1 less

    const sum2 = await molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      _1e18,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );
    const idx = await molochSummoner.daoIdx();
    const newMoloch = await molochSummoner.daos(idx);
    const molochTemp = (await Moloch.attach(newMoloch)) as Moloch;

    const totalShares = await molochTemp.totalShares();
    assert.equal(+totalShares, 1);
  });

  it("require fail - grace period exceeds limit", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      _1e18Plus1,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorGracePeriodLengthExceedsLimit
    );

    // still works with 1 less

    const sum2 = await molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      _1e18,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );
    const idx = await molochSummoner.daoIdx();
    const newMoloch = await molochSummoner.daos(idx);
    const molochTemp = (await Moloch.attach(newMoloch)) as Moloch;

    const totalShares = await molochTemp.totalShares();
    assert.equal(+totalShares, 1);
  });

  it("require fail - dilution bound can not be zero", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      0,
      deploymentConfig.PROCESSING_REWARD
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorDilutionBoundCannotBe0
    );
  });

  it("require fail - dilution bound exceeds limit", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      _1e18Plus1,
      deploymentConfig.PROCESSING_REWARD
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorDilutionBoundExceedsLimitExceedsLimit
    );

    // still works with 1 less

    const sum2 = await molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      _1e18,
      deploymentConfig.PROCESSING_REWARD
    );
    const idx = await molochSummoner.daoIdx();
    const newMoloch = await molochSummoner.daos(idx);
    const molochTemp = (await Moloch.attach(newMoloch)) as Moloch;
    const totalShares = await molochTemp.totalShares();
    assert.equal(+totalShares, 1);
  });

  it("require fail - need at least one approved token", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorNeedAtLeastOneApprovedToken
    );
  });

  it("require fail - too many tokens", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      addressArray(MAX_TOKEN_WHITELIST_COUNT.add(1)),
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorTooManyTokens
    );
  });

  it("require fail - deposit cannot be smaller than processing reward", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [anyErc20.address],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      _1e18,
      deploymentConfig.DILUTION_BOUND,
      _1e18Plus1
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorDepositCannotBeSmallerThanProcessingReward
    );
  });

  it("require fail - approved token cannot be zero", async () => {
    const sum = molochSummoner.summonMoloch(
      summoner.address,
      summoner.address,
      [zeroAddress],
      deploymentConfig.PERIOD_DURATION_IN_SECONDS,
      deploymentConfig.VOTING_DURATON_IN_PERIODS,
      deploymentConfig.GRACE_DURATON_IN_PERIODS,
      deploymentConfig.PROPOSAL_DEPOSIT,
      deploymentConfig.DILUTION_BOUND,
      deploymentConfig.PROCESSING_REWARD
    );
    await expect(sum).to.be.revertedWith(
      revertMessages.molochConstructorApprovedTokenCannotBe0
    );
  });

  it("require fail - duplicate approved token", async () => {

    const sum = molochSummoner.summonMoloch(
        summoner.address,
        summoner.address,
        [anyErc20.address, anyErc20.address],
        deploymentConfig.PERIOD_DURATION_IN_SECONDS,
        deploymentConfig.VOTING_DURATON_IN_PERIODS,
        deploymentConfig.GRACE_DURATON_IN_PERIODS,
        deploymentConfig.PROPOSAL_DEPOSIT,
        deploymentConfig.DILUTION_BOUND,
        deploymentConfig.PROCESSING_REWARD
      );
      await expect(sum).to.be.revertedWith(
        revertMessages.molochConstructorDuplicateApprovedToken
      );
  });

  afterEach(async () => {});
});
