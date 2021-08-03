// Based on https://github.com/HausDAO/MinionSummoner/blob/main/MinionFactory.sol
import "@openzeppelin/contracts/utils/Address.sol";

// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor () internal {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and make it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }
}


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

interface IERC721 {
    // brief interface for minion erc721 token txs
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}

interface IERC1155 {
    // brief interface for minion erc1155 token txs
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

interface IERC1155PartialReceiver {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    // batch receive not implemented in escrow yet
    // function onERC1155BatchReceived(
    //     address operator,
    //     address from,
    //     uint256[] calldata ids,
    //     uint256[] calldata values,
    //     bytes calldata data
    // ) external returns (bytes4);
}

interface IMOLOCH {
    // brief interface for moloch dao v2

    function depositToken() external view returns (address);

    function tokenWhitelist(address token) external view returns (bool);

    function getProposalFlags(uint256 proposalId)
        external
        view
        returns (bool[6] memory);

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
}

contract EscrowMinion is IERC721Receiver, ReentrancyGuard, IERC1155PartialReceiver{
    using Address for address;

    mapping(address => mapping(uint256 => TributeEscrowAction)) public actions; // proposalId => Action
    
    uint256 constant MAX_LENGTH = 10;

    enum TributeType {
        ERC20,
        ERC721,
        ERC1155
    }

    struct TributeEscrowAction {
        address[] tokenAddresses;
        uint256[3][] typesTokenIdsAmounts;
        address vaultAddress; // todo multiple vault destinations?
        address proposer;
        address molochAddress;
        uint256 proposalId;
        bool executed;
    }

    event ProposeAction(uint256 proposalId, address proposer, address moloch, address[] tokens, uint256[MAX_LENGTH] types, uint256[MAX_LENGTH] tokenIds, uint256[MAX_LENGTH] amounts, address destinationVault);
    event ExecuteAction(uint256 proposalId, address executor, address moloch);
    event ActionCanceled(uint256 proposalId, address moloch);

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return
            bytes4(
                keccak256("onERC721Received(address,address,uint256,bytes)")
            );
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure override returns(bytes4) {
        return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }


    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param operator address representing the entity calling the function
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param _data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(address operator, address from, address to, uint256 tokenId, bytes memory _data)
        private returns (bool)
    {
        if (!to.isContract()) {
            return true;
        }
        bytes memory returndata = to.functionCall(abi.encodeWithSelector(
            IERC721Receiver(to).onERC721Received.selector,
            operator,
            from,
            tokenId,
            _data
        ), "ERC721: transfer to non ERC721Receiver implementer");
        bytes4 retval = abi.decode(returndata, (bytes4));
        return (retval == IERC721Receiver(to).onERC721Received.selector);
    }

    function _checkOnERC1155Received(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    )
        private returns (bool)
    {
        if (!to.isContract()) {
            return true;
        }
        bytes memory returndata = to.functionCall(abi.encodeWithSelector(
            IERC1155PartialReceiver(to).onERC1155Received.selector,
            operator,
            from,
            id,
            amount,
            data
        ), "ERC1155: transfer to non ERC1155Receiver implementer");
        bytes4 retval = abi.decode(returndata, (bytes4));
        return (retval == IERC1155PartialReceiver(to).onERC1155Received.selector);
    }

    function doTransfers(
        TributeEscrowAction memory action,
        address from,
        address to
    ) internal {
        // first confirm that the destination vault is a valid receiver for ERC721 and ERC1155
        bool checked1155;
        bool checked721;
        
        // NOTE we are not checking if ERC20 is supported. Should we?

        for (uint256 index = 0; index < action.typesTokenIdsAmounts.length; index++) {
            if (action.typesTokenIdsAmounts[index][0] == uint256(TributeType.ERC721)) {
                if (!checked721) {
                    require(_checkOnERC721Received(address(this), address(this), action.vaultAddress, 0, ""), "!ERC721");
                    checked721 = true;
                }
                IERC721 erc721 = IERC721(action.tokenAddresses[index]);
                erc721.safeTransferFrom(from, to, action.typesTokenIdsAmounts[index][1]);
            } else if (action.typesTokenIdsAmounts[index][0] == uint256(TributeType.ERC20)) {
                IERC20 erc20 = IERC20(action.tokenAddresses[index]);
                if (from == address(this)) {
                    erc20.transfer(to, action.typesTokenIdsAmounts[index][2]);
                } else {
                    erc20.transferFrom(from, to, action.typesTokenIdsAmounts[index][2]);
                }
            } else if (action.typesTokenIdsAmounts[index][0] == uint256(TributeType.ERC1155)) {
                if (!checked1155) {
                    require(_checkOnERC1155Received(address(this), address(this), action.vaultAddress, 0, 0, ""), "!ERC1155");
                    checked1155 = true;
                }
                IERC1155 erc1155 = IERC1155(action.tokenAddresses[index]);
                erc1155.safeTransferFrom(
                    from,
                    to,
                    action.typesTokenIdsAmounts[index][1],
                    action.typesTokenIdsAmounts[index][2],
                    ""
                );
            }
        }
    }

    function saveAction(
        address molochAddress,
        // add array of erc1155, 721 or 20
        address[] calldata tokenAddresses,
        uint256[3][] calldata typesTokenIdsAmounts,
        // uint256[] calldata amounts,
        address vaultAddress,
        uint256 proposalId
    ) private returns (TributeEscrowAction memory) {
        TributeEscrowAction memory action = TributeEscrowAction({
            tokenAddresses: tokenAddresses,
            typesTokenIdsAmounts: typesTokenIdsAmounts,
            vaultAddress: vaultAddress,
            proposer: msg.sender,
            executed: false,
            molochAddress: molochAddress,
            proposalId: proposalId
        });

        actions[molochAddress][proposalId] = action;
        return action;
    }
    
    function emitProposalEvent(TributeEscrowAction memory action) internal {
        uint256[MAX_LENGTH] memory types;
        uint256[MAX_LENGTH] memory tokenIds;
        uint256[MAX_LENGTH] memory amounts;
        
        for (uint256 index = 0; index < action.typesTokenIdsAmounts.length; index++) {
            types[index] =action.typesTokenIdsAmounts[index][0];
            tokenIds[index] = action.typesTokenIdsAmounts[index][1];
            amounts[index] = action.typesTokenIdsAmounts[index][2];
        }
        emit ProposeAction(action.proposalId, msg.sender, action.molochAddress, action.tokenAddresses, types, tokenIds, amounts, action.vaultAddress);
    }

    //  -- Proposal Functions --
    /**
     * @notice Creates a proposal and moves NFT into escrow
     * @param molochAddress Address of DAO
     * @param tokenAddresses Token contract address
     * @param typesTokenIdsAmounts Token id.
     * @param vaultAddress Address of DAO's NFT vault
     * @param requestSharesLootFunds Amount of shares requested
     // add funding request token
     * @param details Info about proposal
     */
    function proposeTribute(
        address molochAddress,
        // add array of erc1155, 721 or 20
        address[] calldata tokenAddresses,
        uint256[3][] calldata typesTokenIdsAmounts,
        address vaultAddress,
        uint256[3] calldata requestSharesLootFunds, // also request loot or treasury funds
        string calldata details
    ) external nonReentrant returns (uint256) {
        IMOLOCH thisMoloch = IMOLOCH(molochAddress);
        address thisMolochDepositToken = thisMoloch.depositToken();

        require(vaultAddress != address(0), "invalid vaultAddress");
        
        // require length check
        require(typesTokenIdsAmounts.length == tokenAddresses.length, "!same-length");
        
        require(typesTokenIdsAmounts.length <= 10, "!max-length");

        uint256 proposalId = thisMoloch.submitProposal(
            msg.sender,
            requestSharesLootFunds[0],
            requestSharesLootFunds[1],
            0,
            thisMolochDepositToken,
            requestSharesLootFunds[2],
            thisMolochDepositToken,
            details
        );

        TributeEscrowAction memory action = saveAction(
            molochAddress,
            tokenAddresses,
            typesTokenIdsAmounts,
            vaultAddress,
            proposalId
        );
        
        emitProposalEvent(action);

        doTransfers(action, msg.sender, address(this));

        return proposalId;
    }

    function executeAction(uint256 proposalId, address molochAddress) external nonReentrant {
        IMOLOCH thisMoloch = IMOLOCH(molochAddress);

        TributeEscrowAction memory action = actions[molochAddress][proposalId];
        bool[6] memory flags = thisMoloch.getProposalFlags(proposalId);

        require(action.vaultAddress != address(0), "invalid proposalId");
        // TODO check for IERC721Receiver interface

        require(!action.executed, "action executed");

        require(flags[1], "proposal not processed");

        require(!flags[3], "proposal cancelled");

        address destination;
        // if passed, send NFT to vault
        if (flags[2]) {
            destination = action.vaultAddress;
        } else {
            destination = action.proposer;
        }

        actions[molochAddress][proposalId].executed = true;

        doTransfers(action, address(this), destination);

        emit ExecuteAction(proposalId, msg.sender, molochAddress);
    }

    function cancelAction(uint256 _proposalId, address molochAddress) external nonReentrant {
        IMOLOCH thisMoloch = IMOLOCH(molochAddress);
        TributeEscrowAction memory action = actions[molochAddress][_proposalId];

        require(!action.executed, "action executed");

        require(msg.sender == action.proposer, "not proposer");
        thisMoloch.cancelProposal(_proposalId);

        delete actions[molochAddress][_proposalId];

        doTransfers(action, address(this), msg.sender);

        emit ActionCanceled(_proposalId, molochAddress);
    }
}
