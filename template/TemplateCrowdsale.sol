pragma solidity ^0.4.21;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
//#if D_SOFT_CAP_WEI != 0
import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
//#endif
import "./MainCrowdsale.sol";
//#if "D_AUTO_FINALISE" != "false"
import "./Checkable.sol";
//#endif
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
    event TimesChanged(uint startTime, uint endTime, uint oldStartTime, uint oldEndTime);
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

        emit Initialized();
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
        bool result = !isFinalized && hasEnded();
        emit Checked(result);
        return result;
    }

    /**
     * @dev Do inner action if check was success.
     */
    function internalAction() internal {
        finalization();
        emit Finalized();

        isFinalized = true;
    }
    //#endif

    //#if defined(D_MIN_VALUE_WEI) || defined(D_MAX_VALUE_WEI)
    /**
     * @dev override purchase validation to add extra value logic.
     * @return true if sended more than minimal value
     */
    function validPurchase() internal view returns (bool) {
        //#if defined(D_MIN_VALUE_WEI) && "D_MIN_VALUE_WEI" != 0
        bool minValue = msg.value >= D_MIN_VALUE_WEI;
        //#endif
        //#if defined(D_MAX_VALUE_WEI) && "D_MAX_VALUE_WEI" != 0
        bool maxValue = msg.value <= D_MAX_VALUE_WEI;
        //#endif

        return
        //#if defined(D_MIN_VALUE_WEI) && "D_MIN_VALUE_WEI" != 0
            minValue &&
        //#endif
        //#if defined(D_MAX_VALUE_WEI) && "D_MAX_VALUE_WEI" != 0
            maxValue &&
        //#endif
            super.validPurchase();
    }
    //#endif

    //#if defined(D_MIN_VALUE_WEI)
    /**
     * @dev override hasEnded to add minimal value logic
     * @return true if remained to achieve less than minimal
     */
    function hasEnded() public view returns (bool) {
        bool remainValue = cap.sub(weiRaised) < D_MIN_VALUE_WEI;
        return super.hasEnded() || remainValue;
    }
    //#endif

    //#if D_CAN_CHANGE_START_TIME == true
    function setStartTime(uint _startTime) public onlyOwner {
        // only if CS was not started
        require(now < startTime);
        // only move time to future
        require(_startTime > startTime);
        require(_startTime < endTime);
        emit TimesChanged(_startTime, endTime, startTime, endTime);
        startTime = _startTime;
    }
    //#endif

    //#if D_CAN_CHANGE_END_TIME == true
    function setEndTime(uint _endTime) public onlyOwner {
        // only if CS was not ended
        require(now < endTime);
        // only if new end time in future
        require(now < _endTime);
        require(_endTime > startTime);
        emit TimesChanged(startTime, _endTime, startTime, endTime);
        endTime = _endTime;
    }
    //#endif

    //#if D_CAN_CHANGE_START_TIME == true && D_CAN_CHANGE_END_TIME == true
    function setTimes(uint _startTime, uint _endTime) public onlyOwner {
        require(_endTime > _startTime);
        uint oldStartTime = startTime;
        uint oldEndTime = endTime;
        bool changed = false;
        if (_startTime != oldStartTime) {
            require(_startTime > now);
            // only if CS was not started
            require(now < oldStartTime);
            // only move time to future
            require(_startTime > oldStartTime);

            startTime = _startTime;
            changed = true;
        }
        if (_endTime != oldEndTime) {
            // only if CS was not ended
            require(now < oldEndTime);
            // end time in future
            require(now < _endTime);

            endTime = _endTime;
            changed = true;
        }

        if (changed) {
            emit TimesChanged(startTime, _endTime, startTime, endTime);
        }
    }
    //#endif

}
