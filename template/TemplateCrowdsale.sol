pragma solidity ^0.4.23;

//#if D_SOFT_CAP_WEI != 0
import "openzeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
//#endif
import "./MainCrowdsale.sol";
//#if D_AUTO_FINALISE
import "sc-library/contracts/Checkable.sol";
//#endif
//#if D_BONUS_TOKENS
import "./BonusableCrowdsale.sol";
//#endif
//#if D_WHITELIST_ENABLED
import "./WhitelistedCrowdsale.sol";
//#endif


contract TemplateCrowdsale is Consts, MainCrowdsale
    //#if D_BONUS_TOKENS
    , BonusableCrowdsale
    //#endif
    //#if D_SOFT_CAP_WEI != 0
    , RefundableCrowdsale
    //#endif
    //#if D_AUTO_FINALISE
    , Checkable
    //#endif
    //#if D_WHITELIST_ENABLED
    , WhitelistedCrowdsale
    //#endif
{
    event Initialized();
    event TimesChanged(uint startTime, uint endTime, uint oldStartTime, uint oldEndTime);
    bool public initialized = false;

    constructor(MintableToken _token) public
        Crowdsale(D_RATE * TOKEN_DECIMAL_MULTIPLIER, D_COLD_WALLET, _token)
        TimedCrowdsale(START_TIME > now ? START_TIME : now, D_END_TIME)
        CappedCrowdsale(D_HARD_CAP_WEI)
        //#if D_SOFT_CAP_WEI != 0
        RefundableCrowdsale(D_SOFT_CAP_WEI)
        //#endif
    {
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

    //#if defined(D_MIN_VALUE_WEI)
    /**
     * @dev override hasClosed to add minimal value logic
     * @return true if remained to achieve less than minimal
     */
    function hasClosed() public view returns (bool) {
        bool remainValue = cap.sub(weiRaised) < D_MIN_VALUE_WEI;
        return super.hasClosed() || remainValue;
    }
    //#endif

    //#if D_CAN_CHANGE_START_TIME == true
    function setStartTime(uint _startTime) public onlyOwner {
        // only if CS was not started
        require(now < openingTime);
        // only move time to future
        require(_startTime > openingTime);
        require(_startTime < closingTime);
        emit TimesChanged(_startTime, closingTime, openingTime, closingTime);
        openingTime = _startTime;
    }
    //#endif

    //#if D_CAN_CHANGE_END_TIME == true
    function setEndTime(uint _endTime) public onlyOwner {
        // only if CS was not ended
        require(now < closingTime);
        // only if new end time in future
        require(now < _endTime);
        require(_endTime > openingTime);
        emit TimesChanged(openingTime, _endTime, openingTime, closingTime);
        closingTime = _endTime;
    }
    //#endif

    //#if D_CAN_CHANGE_START_TIME && D_CAN_CHANGE_END_TIME
    function setTimes(uint _startTime, uint _endTime) public onlyOwner {
        require(_endTime > _startTime);
        uint oldStartTime = openingTime;
        uint oldEndTime = closingTime;
        bool changed = false;
        if (_startTime != oldStartTime) {
            require(_startTime > now);
            // only if CS was not started
            require(now < oldStartTime);
            // only move time to future
            require(_startTime > oldStartTime);

            openingTime = _startTime;
            changed = true;
        }
        if (_endTime != oldEndTime) {
            // only if CS was not ended
            require(now < oldEndTime);
            // end time in future
            require(now < _endTime);

            closingTime = _endTime;
            changed = true;
        }

        if (changed) {
            emit TimesChanged(openingTime, _endTime, openingTime, closingTime);
        }
    }
    //#endif

    //#if D_AUTO_FINALISE
    /**
     * @dev Do inner check.
     * @return bool true of accident triggered, false otherwise.
     */
    function internalCheck() internal returns (bool) {
        bool result = !isFinalized && hasClosed();
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
    function _preValidatePurchase(
        address _beneficiary,
        uint256 _weiAmount
    )
        internal
    {
        //#if defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        require(msg.value >= D_MIN_VALUE_WEI);
        //#endif
        //#if defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        require(msg.value <= D_MAX_VALUE_WEI);
        //#endif
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }
    //#endif
}
