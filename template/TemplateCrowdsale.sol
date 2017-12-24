pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "./MainCrowdsale.sol";
import "./Checkable.sol";
import "./BonusableCrowdsale.sol";

contract TemplateCrowdsale is usingConsts, MainCrowdsale
    //#if "D_BONUS_TOKENS" != "false"
    , BonusableCrowdsale
    //#endif
    //#if D_SOFT_CAP_ETH != 0
    , RefundableCrowdsale
    //#endif
    , CappedCrowdsale
    //#if "D_AUTO_FINALISE" != "false"
    , Checkable
    //#endif
{
    event Initialized();
    bool public initialized = false;

    function TemplateCrowdsale(MintableToken _token)
        Crowdsale(D_START_TIME, D_END_TIME, D_RATE, D_COLD_WALLET)
        CappedCrowdsale(D_HARD_CAP_ETH)
        //#if D_SOFT_CAP_ETH != 0
        RefundableCrowdsale(D_SOFT_CAP_ETH)
        //#endif
    {
        token = _token;
    }

    function init() public onlyOwner {
        require(!initialized);
        initialized = true;

        //#if D_PREMINT_COUNT > 0
        address[D_PREMINT_COUNT] memory addresses = [D_PREMINT_ADDRESSES];
        uint[D_PREMINT_COUNT] memory amounts = [D_PREMINT_AMOUNTS];
        uint64[D_PREMINT_COUNT] memory freezes = [D_PREMINT_FREEZES];

        for (uint i = 0; i < addresses.length; i ++) {
            if (freezes[i] == 0) {
                token.mint(addresses[i], amounts[i]);
            }
            else {
                FreezableMintableToken(token).mintAndFreeze(addresses[i], amounts[i], freezes[i]);
            }
        }
        //#endif

        transferOwnership(D_COLD_WALLET);
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
}
