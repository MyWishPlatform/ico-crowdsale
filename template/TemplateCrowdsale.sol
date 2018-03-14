pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "./MainCrowdsale.sol";
import "./Checkable.sol";
import "./BonusableCrowdsale.sol";

contract TemplateCrowdsale is usingConsts, MainCrowdsale
    //#if "D_BONUS_TOKENS" != "false"
    , BonusableCrowdsale
    //#endif
    //#if D_SOFT_CAP_WEI != 0
    , RefundableCrowdsale
    //#endif
    , CappedCrowdsale
    //#if "D_AUTO_FINALISE" != "false"
    , Checkable
    //#endif
{
    function TemplateCrowdsale(MintableToken _token)
        Crowdsale(START_TIME > now ? START_TIME : now, D_END_TIME, D_RATE * TOKEN_DECIMAL_MULTIPLIER, D_COLD_WALLET)
        CappedCrowdsale(D_HARD_CAP_WEI)
        //#if D_SOFT_CAP_WEI != 0
        RefundableCrowdsale(D_SOFT_CAP_WEI)
        //#endif
    {
        token = _token;
        transferOwnership(TARGET_USER);
    }

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
