pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";

contract BonusableCrowdsale is Crowdsale {

    function buyTokens(address beneficiary) public payable {
        require(beneficiary != address(0));
        require(validPurchase());

        uint256 weiAmount = msg.value;

        // calculate token amount to be created
        uint256 bonusRate = getBonusRate(weiAmount);
        uint256 tokens = weiAmount.mul(bonusRate);

        // update state
        weiRaised = weiRaised.add(weiAmount);

        token.mint(beneficiary, tokens);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

        forwardFunds();
    }

    function getBonusRate(uint256 weiAmount) internal returns (uint256) {
        uint256 baseRate = D_RATE;
        uint256 rate = baseRate;

        //#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
        // apply bonus for time & weiRaised
        uint[D_WEI_RAISED_AND_TIME_BONUS_COUNT] memory weiRaisedBoundaries = [D_WEI_RAISED_BOUNDARIES];
        uint64[D_WEI_RAISED_AND_TIME_BONUS_COUNT] memory timeBoundaries = [D_TIME_BOUNDARIES];
        uint[D_WEI_RAISED_AND_TIME_BONUS_COUNT] memory weiRaisedAndTimeRates = [D_WEI_RAISED_AND_TIME_MILLIRATES];

        for (uint i = 0; i < D_WEI_RAISED_AND_TIME_BONUS_COUNT; i++) {
            if (weiRaised <= weiRaisedBoundaries[i] || now <= timeBoundaries[i]) {
                rate += baseRate * weiRaisedAndTimeRates[i] / 1000;
                break;
            }
        }
        //#endif

        //#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
        // apply amount
        uint[D_WEI_AMOUNT_BONUS_COUNT] memory weiAmountBoundaries = [D_WEI_AMOUNT_BOUNDARIES];
        uint[D_WEI_AMOUNT_BONUS_COUNT] memory weiAmountRates = [D_WEI_AMOUNT_MILLIRATES];

        for (uint j = 0; j < D_WEI_AMOUNT_BONUS_COUNT; j++) {
            if (weiAmount >= weiAmountBoundaries[j]) {
                rate += rate * weiAmountRates[j] / 1000;
                break;
            }
        }
        //#endif

        return rate;
    }
}