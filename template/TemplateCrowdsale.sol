pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "./MainCrowdsale.sol";
import "./Checkable.sol";
import "./BonusableCrowdsale.sol";

contract TemplateCrowdsale is Consts, MainCrowdsale
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
    event Initialized();
    bool public initialized = false;

    function TemplateCrowdsale(MintableToken _token) public
        Crowdsale(START_TIME > now ? START_TIME : now, D_END_TIME, D_RATE * TOKEN_DECIMAL_MULTIPLIER, D_COLD_WALLET)
        CappedCrowdsale(D_HARD_CAP_WEI)
        //#if D_SOFT_CAP_WEI != 0
        RefundableCrowdsale(D_SOFT_CAP_WEI)
        //#endif
    {
        token = _token;
    }

    function init() public onlyOwner {
        require(!initialized);
        initialized = true;

        if (PAUSED) {
            MainToken(token).pause();
        }

        //#if D_PREMINT_COUNT > 0
        address[D_PREMINT_COUNT] memory addresses = [D_PREMINT_ADDRESSES];
        uint[D_PREMINT_COUNT] memory amounts = [D_PREMINT_AMOUNTS];
        uint64[D_PREMINT_COUNT] memory freezes = [D_PREMINT_FREEZES];

        for (uint i = 0; i < addresses.length; i++) {
            if (freezes[i] == 0) {
                MainToken(token).mint(addresses[i], amounts[i]);
            } else {
                MainToken(token).mintAndFreeze(addresses[i], amounts[i], freezes[i]);
            }
        }
        //#endif

        transferOwnership(TARGET_USER);

        Initialized();
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

    //#if defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
    /**
     * @dev override purchase validation to add extra value logic.
     * @return true if sended more than minimal value
     */
    function validPurchase() internal view returns (bool) {
        bool minValue = msg.value >= D_MIN_VALUE_WEI;
        return minValue && super.validPurchase();
    }
    //#endif
}
