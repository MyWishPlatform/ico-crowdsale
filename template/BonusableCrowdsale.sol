pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "./Consts.sol";


contract BonusableCrowdsale is Consts, Crowdsale {
    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param _weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 _weiAmount)
        internal view returns (uint256)
    {
        uint256 bonusRate = getBonusRate(_weiAmount);
        return _weiAmount.mul(bonusRate).div(1 ether);
    }

    function getBonusRate(uint256 _weiAmount) internal view returns (uint256) {
        uint256 bonusRate = rate;

        //#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
        // apply bonus for time & weiRaised
        uint[D_WEI_RAISED_AND_TIME_BONUS_COUNT] memory weiRaisedStartsBounds = [D_WEI_RAISED_STARTS_BOUNDARIES];
        uint[D_WEI_RAISED_AND_TIME_BONUS_COUNT] memory weiRaisedEndsBounds = [D_WEI_RAISED_ENDS_BOUNDARIES];
        uint64[D_WEI_RAISED_AND_TIME_BONUS_COUNT] memory timeStartsBounds = [D_TIME_STARTS_BOUNDARIES];
        uint64[D_WEI_RAISED_AND_TIME_BONUS_COUNT] memory timeEndsBounds = [D_TIME_ENDS_BOUNDARIES];
        uint[D_WEI_RAISED_AND_TIME_BONUS_COUNT] memory weiRaisedAndTimeRates = [D_WEI_RAISED_AND_TIME_MILLIRATES];

        for (uint i = 0; i < D_WEI_RAISED_AND_TIME_BONUS_COUNT; i++) {
            bool weiRaisedInBound = (weiRaisedStartsBounds[i] <= weiRaised) && (weiRaised < weiRaisedEndsBounds[i]);
            bool timeInBound = (timeStartsBounds[i] <= now) && (now < timeEndsBounds[i]);
            if (weiRaisedInBound && timeInBound) {
                bonusRate += bonusRate * weiRaisedAndTimeRates[i] / 1000;
            }
        }
        //#endif

        //#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
        // apply amount
        uint[D_WEI_AMOUNT_BONUS_COUNT] memory weiAmountBounds = [D_WEI_AMOUNT_BOUNDARIES];
        uint[D_WEI_AMOUNT_BONUS_COUNT] memory weiAmountRates = [D_WEI_AMOUNT_MILLIRATES];

        for (uint j = 0; j < D_WEI_AMOUNT_BONUS_COUNT; j++) {
            if (_weiAmount >= weiAmountBounds[j]) {
                bonusRate += bonusRate * weiAmountRates[j] / 1000;
                break;
            }
        }
        //#endif

        return bonusRate;
    }
}
