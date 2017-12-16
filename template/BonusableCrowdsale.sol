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

        //#if D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
        // apply bonus for time & weiRaised
        uint[D_WEI_RAISED_AND_TIME_BONUS_COUNT + 1] memory weiRaisedBoundaries = [uint(0), D_WEI_RAISED_BOUNDARIES];
        uint64[D_WEI_RAISED_AND_TIME_BONUS_COUNT + 1] memory timeBoundaries = [uint64(D_START_TIME), D_TIME_BOUNDARIES];
        uint[D_WEI_RAISED_AND_TIME_BONUS_COUNT + 1] memory weiRaisedAndTimeRates = [uint(0), D_WEI_RAISED_AND_TIME_RATES];

        for (uint i = D_WEI_RAISED_AND_TIME_BONUS_COUNT; i >= 0; i--) {
            if (weiRaised >= weiRaisedBoundaries[i] || now >= timeBoundaries[i]) {
                rate += baseRate * weiRaisedAndTimeRates[i];
                break;
            }
        }
        //#endif

        //#if D_WEI_AMOUNT_BONUS_COUNT > 0
        // apply amount
        uint[D_WEI_AMOUNT_BONUS_COUNT + 1] memory weiAmountBoundaries = [uint(0), D_WEI_AMOUNT_BOUNDARIES];
        uint[D_WEI_AMOUNT_BONUS_COUNT + 1] memory weiAmountRates = [uint(0), D_WEI_AMOUNT_RATES];

        for (i = D_WEI_AMOUNT_BONUS_COUNT; i >= 0; i--) {
            if (weiAmount >= weiAmountBoundaries[i]) {
                rate += rate * weiAmountRates[i];
                break;
            }
        }
        //#endif

        return rate;
    }
}