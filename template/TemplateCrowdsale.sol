pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "./MainCrowdsale.sol";
import "./Checkable.sol";

contract TemplateCrowdsale is usingConsts, MainCrowdsale
    //#if D_SOFT_CAP_ETH != 0
    , RefundableCrowdsale
    //#endif
    , CappedCrowdsale
    //#if "D_AUTO_FINALISE" != "false"
    , Checkable
    //#endif
{

    function TemplateCrowdsale(MintableToken _token)
        Crowdsale(D_START_TIME, D_END_TIME, D_RATE, D_COLD_WALLET)
        CappedCrowdsale(D_HARD_CAP_ETH * TOKEN_DECIMAL_MULTIPLIER)
        //#if D_SOFT_CAP_ETH != 0
        RefundableCrowdsale(D_SOFT_CAP_ETH * TOKEN_DECIMAL_MULTIPLIER)
        //#endif
    {
        token = _token;
    }

    //#if "D_TOKENS_ADDRESS_1" != ""
    function init() onlyOwner public {
        //#if "D_TOKENS_ADDRESS_1" != "" && D_TOKENS_FREEZE_1 == 0
        token.mint(D_TOKENS_ADDRESS_1, D_TOKENS_AMOUNT_1);
        //#elif "D_TOKENS_ADDRESS_1" != "" && D_TOKENS_FREEZE_1 != 0
        FreezableMintableToken(token).mintAndFreeze(D_TOKENS_ADDRESS_1, D_TOKENS_AMOUNT_1, D_TOKENS_FREEZE_1);
        //#endif
        //#if "D_TOKENS_ADDRESS_2" != "" && D_TOKENS_FREEZE_2 == 0
        token.mint(D_TOKENS_ADDRESS_2, D_TOKENS_AMOUNT_2);
        //#elif "D_TOKENS_ADDRESS_2" != "" && D_TOKENS_FREEZE_2 != 0
        FreezableMintableToken(token).mintAndFreeze(D_TOKENS_ADDRESS_2, D_TOKENS_AMOUNT_2, D_TOKENS_FREEZE_2);
        //#endif
        //#if "D_TOKENS_ADDRESS_3" != "" && D_TOKENS_FREEZE_3 == 0
        token.mint(D_TOKENS_ADDRESS_3, D_TOKENS_AMOUNT_3);
        //#elif "D_TOKENS_ADDRESS_3" != "" && D_TOKENS_FREEZE_3 != 0
        FreezableMintableToken(token).mintAndFreeze(D_TOKENS_ADDRESS_3, D_TOKENS_AMOUNT_3, D_TOKENS_FREEZE_3);
        //#endif

        transferOwnership(D_COLD_WALLET);
    }
    //#endif

    /**
     * @dev override token creation to set token address in constructor.
     */
    function createTokenContract() internal returns (MintableToken) {
        return MintableToken(0);
    }

    //#if "D_AUTO_FINALISE" != "false"
    /**
     * @dev Do inner check.
     * @return bool true of accident triggered, false otherwise.
     */
    function internalCheck() internal returns (bool) {
        return !isFinalized && hasEnded();
    }

    /**
     * @dev Do inner action if check was success.
     */
    function internalAction() internal {
        finalization();
        Finalized();

        isFinalized = true;
    }
    //#endif
}
