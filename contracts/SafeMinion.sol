// Based on https://github.com/HausDAO/MinionSummoner/blob/main/MinionFactory.sol

// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/libraries/MultiSend.sol";
import "./zodiac/core/Module.sol";
import "./zodiac/factory/ModuleProxyFactory.sol";

interface IERC20 {
    // brief interface for moloch erc20 token txs
    function balanceOf(address who) external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);
}

interface IMOLOCH {
    // brief interface for moloch dao v2

    function depositToken() external view returns (address);

    function tokenWhitelist(address token) external view returns (bool);

    function totalShares() external view returns (uint256);

    function getProposalFlags(uint256 proposalId)
        external
        view
        returns (bool[6] memory);

    function getUserTokenBalance(address user, address token)
        external
        view
        returns (uint256);

    function members(address user)
        external
        view
        returns (
            address,
            uint256,
            uint256,
            bool,
            uint256,
            uint256
        );

    function memberAddressByDelegateKey(address user)
        external
        view
        returns (address);

    function userTokenBalances(address user, address token)
        external
        view
        returns (uint256);

    function cancelProposal(uint256 proposalId) external;

    function submitProposal(
        address applicant,
        uint256 sharesRequested,
        uint256 lootRequested,
        uint256 tributeOffered,
        address tributeToken,
        uint256 paymentRequested,
        address paymentToken,
        string calldata details
    ) external returns (uint256);

    function withdrawBalance(address token, uint256 amount) external;

    struct Proposal {
        address applicant; // the applicant who wishes to become a member - this key will be used for withdrawals (doubles as guild kick target for gkick proposals)
        address proposer; // the account that submitted the proposal (can be non-member)
        address sponsor; // the member that sponsored the proposal (moving it into the queue)
        uint256 sharesRequested; // the # of shares the applicant is requesting
        uint256 lootRequested; // the amount of loot the applicant is requesting
        uint256 tributeOffered; // amount of tokens offered as tribute
        address tributeToken; // tribute token contract reference
        uint256 paymentRequested; // amount of tokens requested as payment
        address paymentToken; // payment token contract reference
        uint256 startingPeriod; // the period in which voting can start for this proposal
        uint256 yesVotes; // the total number of YES votes for this proposal
        uint256 noVotes; // the total number of NO votes for this proposal
        bool[6] flags; // [sponsored, processed, didPass, cancelled, whitelist, guildkick]
        string details; // proposal details - could be IPFS hash, plaintext, or JSON
        uint256 maxTotalSharesAndLootAtYesVote; // the maximum # of total shares encountered at a yes vote on this proposal
    }

    function proposals(uint256 proposalId)
        external
        returns (
            address,
            address,
            address,
            uint256,
            uint256,
            uint256,
            address,
            uint256,
            address,
            uint256,
            uint256,
            uint256
        );
}

contract SafeMinion is Enum, Module {
    IMOLOCH public moloch;
    address public multisend;
    address public molochDepositToken;
    uint256 public minQuorum;
    mapping(uint256 => Action) public actions; // proposalId => Action

    // events consts

    string private constant ERROR_INIT = "Minion::initialized";
    string private constant ERROR_REQS_NOT_MET =
        "Minion::proposal execution requirements not met";
    string private constant ERROR_NOT_VALID = "Minion::not a valid operation";
    string private constant ERROR_EXECUTED = "Minion::action already executed";
    string private constant ERROR_DELETED = "Minion::action was deleted";
    string private constant ERROR_CALL_FAIL = "Minion::call failure";
    string private constant ERROR_NOT_WL = "Minion::not a whitelisted token";
    string private constant ERROR_TX_FAIL = "Minion::token transfer failed";
    string private constant ERROR_NOT_PROPOSER = "Minion::not proposer";
    string private constant ERROR_MEMBER_ONLY = "Minion::not member";
    string private constant ERROR_EXECUTOR_ONLY = "Minion::not avatar";
    string private constant ERROR_NOT_SPONSORED =
        "Minion::proposal not sponsored";
    string private constant ERROR_NOT_PASSED =
        "Minion::proposal has not passed";
    string private constant ERROR_MIN_QUORUM_BOUNDS =
        "Minion::minQuorum must be 0 to 100";
    string private constant ERROR_ZERO_DEPOSIT_TOKEN =
        "Minion:zero deposit token is not allowed";
    string private constant ERROR_NO_ACTION = "Minion:action does not exist";

    struct Action {
        bytes32 id;
        address proposer;
        bool executed;
        address token;
        uint256 amount;
        address moloch;
        bool memberOnlyEnabled; // 0 anyone , 1 memberOnly
    }

    mapping(bytes32 => DAOSignature) public signatures; // msgHash => Signature
    struct DAOSignature {
        bytes32 signatureHash;
        bytes4 magicValue;
    }

    event ProposeNewAction(
        bytes32 indexed id,
        uint256 indexed proposalId,
        address withdrawToken,
        uint256 withdrawAmount,
        address moloch,
        bool memberOnly,
        bytes transactions
    );
    event ExecuteAction(
        bytes32 indexed id,
        uint256 indexed proposalId,
        bytes transactions,
        address avatar
    );

    event DoWithdraw(address token, uint256 amount);
    event CrossWithdraw(address target, address token, uint256 amount);
    event PulledFunds(address moloch, uint256 amount);
    event ActionCanceled(uint256 proposalId);
    event ActionDeleted(uint256 proposalId);

    event ProposeSignature(
        uint256 proposalId,
        bytes32 msgHash,
        address proposer
    );
    event SignatureCanceled(uint256 proposalId, bytes32 msgHash);
    event ExecuteSignature(uint256 proposalId, address avatar);


    modifier memberOnly() {
        require(isMember(msg.sender), ERROR_MEMBER_ONLY);
        _;
    }

    modifier avatarOnly() {
        require(msg.sender == avatar, ERROR_EXECUTOR_ONLY);
        _;
    }

    function setUp(
        bytes memory initializationParams
    ) public override {
        __Ownable_init();
        (address _moloch,address _avatar,address _multisend,uint256 _minQuorum) = abi.decode(initializationParams, (address, address, address, uint256));

        transferOwnership(_avatar);

        // min quorum must be between 0% and 100%, if 0 early execution is disabled
        require(_minQuorum >= 0 && _minQuorum <= 100, ERROR_MIN_QUORUM_BOUNDS);
        moloch = IMOLOCH(_moloch);
        avatar = _avatar;
        multisend = _multisend;

        minQuorum = _minQuorum;
        molochDepositToken = moloch.depositToken();
        // verify that moloch address has a deposit token and it is not zero
        // require(molochDepositToken != address(0), ERROR_ZERO_DEPOSIT_TOKEN);
        initialized = true;
    }

    //  -- Moloch Withdraw Functions --
    function doWithdraw(address token, uint256 amount) public memberOnly {
        // Construct transaction data for safe to execute
        bytes memory withdrawData = abi.encodeWithSelector(
            moloch.withdrawBalance.selector,
            token,
            amount
        );
        require(
            exec(address(moloch),0,withdrawData,Operation.Call),
            ERROR_CALL_FAIL
        );
        emit DoWithdraw(token, amount);
    }

    function crossWithdraw(
        address target,
        address token,
        uint256 amount,
        bool transfer
    ) external memberOnly {
        // @Dev - Target needs to have a withdrawBalance functions
        IMOLOCH(target).withdrawBalance(token, amount);

        // Transfers token into DAO.
        if (transfer) {
            bool whitelisted = moloch.tokenWhitelist(token);
            require(whitelisted, ERROR_NOT_WL);
            require(
                IERC20(token).transfer(address(moloch), amount),
                ERROR_TX_FAIL
            );
        }

        emit CrossWithdraw(target, token, amount);
    }

    //  -- Proposal Functions --
    function proposeAction(
        bytes memory transactions,
        address withdrawToken,
        uint256 withdrawAmount,
        string calldata details,
        bool memberOnlyEnabled
    ) external memberOnly returns (uint256) {
        uint256 proposalId = moloch.submitProposal(
            avatar,
            0,
            0,
            0,
            molochDepositToken,
            withdrawAmount,
            withdrawToken,
            details
        );

        saveAction(
            proposalId,
            transactions,
            withdrawToken,
            withdrawAmount,
            memberOnlyEnabled
        );

        return proposalId;
    }

    function deleteAction(uint256 _proposalId)
        external
        avatarOnly
        returns (bool)
    {
        // check action exists
        require(actions[_proposalId].proposer != address(0), ERROR_NO_ACTION);
        delete actions[_proposalId];
        emit ActionDeleted(_proposalId);
        return true;
    }

    function saveAction(
        uint256 proposalId,
        bytes memory transactions,
        address withdrawToken,
        uint256 withdrawAmount,
        bool memberOnlyEnabled
    ) internal {
        bytes32 id = hashOperation(transactions);
        Action memory action = Action({
            id: id,
            proposer: msg.sender,
            executed: false,
            token: withdrawToken,
            amount: withdrawAmount,
            moloch: address(moloch),
            memberOnlyEnabled: memberOnlyEnabled
        });
        actions[proposalId] = action;
        emit ProposeNewAction(
            id,
            proposalId,
            withdrawToken,
            withdrawAmount,
            address(moloch),
            memberOnlyEnabled,
            transactions
        );
    }

    function executeAction(uint256 proposalId, bytes memory transactions)
        external
        returns (bool)
    {
        Action memory action = actions[proposalId];
        require(!action.executed, ERROR_EXECUTED);
        // Mark executed before doing any external stuff
        actions[proposalId].executed = true;

        if (action.memberOnlyEnabled) {
            require(
                isMember(msg.sender),
                ERROR_MEMBER_ONLY
            );
        }

        require(isPassed(proposalId), ERROR_REQS_NOT_MET);
        require(action.id != 0, ERROR_DELETED);

        bytes32 id = hashOperation(transactions);

        require(id == action.id, ERROR_NOT_VALID);

        if (
            action.amount > 0 &&
            moloch.getUserTokenBalance(avatar, action.token) > 0
        ) {
            // withdraw token tribute if any
            doWithdraw(
                action.token,
                moloch.getUserTokenBalance(avatar, action.token)
            );
        }

        require(
            exec(multisend,0,transactions,Operation.DelegateCall),
            ERROR_CALL_FAIL
        );

        emit ExecuteAction(id, proposalId, transactions, msg.sender);

        delete actions[proposalId];

        return true;
    }

    function cancelAction(uint256 _proposalId) external {
        Action memory action = actions[_proposalId];
        require(msg.sender == action.proposer, ERROR_NOT_PROPOSER);
        delete actions[_proposalId];
        emit ActionCanceled(_proposalId);
        moloch.cancelProposal(_proposalId);
    }

    //  -- Helper Functions --
    function isPassed(uint256 _proposalId) internal returns (bool) {
        uint256 totalShares = moloch.totalShares();
        bool[6] memory flags = moloch.getProposalFlags(_proposalId);
        require(flags[0], ERROR_NOT_SPONSORED);

        // if any of these branches are true, let action proceed before proposal is processed
        if (flags[2]) {
            // if proposal has passed dao return true
            return true;
        }

        if (minQuorum != 0) {
            (, , , , , , , , , , uint256 yesVotes, uint256 noVotes) = moloch
                .proposals(_proposalId);
            uint256 quorum = (yesVotes * 100) / totalShares;
            // if quorum is set it must be met and there can be no NO votes
            return quorum >= minQuorum && noVotes < 1;
        }

        return false;
    }

    function isMember(address user) public view returns (bool) {
        // member only check should check if member or delegate
        address memberAddress = moloch.memberAddressByDelegateKey(user);
        (, uint256 shares, , , , ) = moloch.members(memberAddress);
        return shares > 0;
    }

    function hashOperation(bytes memory transactions)
        public
        pure
        virtual
        returns (bytes32 hash)
    {
        return keccak256(abi.encode(transactions));
    }

    fallback() external payable {}

    receive() external payable {}
}

contract SafeMinionSummoner is ModuleProxyFactory {
    address payable public immutable template; // fixed template for minion using eip-1167 proxy pattern
    address public gnosisSingleton;
    address public gnosisFallback;
    address public gnosisMultisend;
    address[] public minionList;
    uint256 public minionCount;
    mapping(address => AMinion) public minions;
    string public constant minionType = "Safe minion";

    event SummonMinion(
        address indexed minion,
        address indexed moloch,
        address indexed gnosis,
        string details,
        string minionType,
        uint256 minQuorum
    );

    struct AMinion {
        address moloch;
        string details;
    }

    constructor(
        address payable _template,
        address _molochTemplate,
        address _avatarTemplate,
        address _gnosisFallback,
        address _gnosisMultisend
    ) {
        template = _template;
        gnosisSingleton = _avatarTemplate;
        gnosisFallback = _gnosisFallback;
        gnosisMultisend = _gnosisMultisend;
        SafeMinion minion = SafeMinion(_template);
        minion.setUp(abi.encode(_molochTemplate, _avatarTemplate, _gnosisMultisend, 0));
    }

    function summonMinion(
        address moloch,
        address avatar,
        string memory details,
        uint256 minQuorum,
        uint256 saltNonce
    ) external returns (address) {
        bytes memory initializer = abi.encode(moloch, avatar, gnosisMultisend, minQuorum);

        bytes memory initializerCall = abi.encodeWithSignature(
            "setUp(bytes)",
            initializer
        );

        SafeMinion minion = SafeMinion(payable(deployModule(template, initializerCall, saltNonce)));

        minions[address(minion)] = AMinion(moloch, details);
        minionList.push(address(minion));
        minionCount++;
        emit SummonMinion(
            address(minion),
            moloch,
            avatar,
            details,
            minionType,
            minQuorum
        );

        return (address(minion));
    }

    function summonMinionAndSafe(
        address moloch,
        string memory details,
        uint256 minQuorum,
        bytes32 salt
    ) external returns (address) {
        // Deploy new minion
        SafeMinion minion = SafeMinion(payable(createProxy(template, salt)));

        // Workaround for solidity dynamic memory array
        address[] memory owners = new address[](1);
        owners[0] = address(minion);

        // Deploy new safe
        address proxy = createProxy(gnosisSingleton, salt);
        GnosisSafe safe = GnosisSafe(payable(address(proxy)));

        // Configure Safe START
        bytes memory enableMinion = abi.encodeWithSignature(
            "enableModule(address)",
            address(minion)
        );

        // Encode minion enable to be called by the multisend contract via delegate call
        bytes memory enableMinionMultisend = abi.encodePacked(
            uint8(0),
            proxy,
            uint256(0),
            uint256(enableMinion.length),
            bytes(enableMinion)
        );
        bytes memory multisendAction = abi.encodeWithSignature(
            "multiSend(bytes)",
            enableMinionMultisend
        );

        safe.setup(
            owners,
            1,
            gnosisMultisend,
            multisendAction,
            gnosisFallback,
            address(0),
            0,
            payable(address(0))
        );
        // Configure Safe END


        minion.setUp(abi.encode(moloch, proxy, gnosisMultisend, minQuorum));

        minions[address(minion)] = AMinion(moloch, details);
        minionList.push(address(minion));
        minionCount++;
        emit SummonMinion(
            address(minion),
            moloch,
            proxy,
            details,
            minionType,
            minQuorum
        );

        return (address(minion));
    }
}
