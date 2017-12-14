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
        uint256 baseRate = this.rate;
        uint256 rate = baseRate;

        // apply bonus for time & weiRaised
        //#if defined(D_WEI_RAISED_BOUNDARY_1) && defined(D_TIME_BOUNDARY_1) && defined(D_BONUS1_RATE_1)
        if (weiRaised < D_WEI_RAISED_BOUNDARY_1 && startTime < D_TIME_BOUNDARY_1) {
            rate += baseRate * D_BONUS1_RATE_1;
        }
        //#endif
        //#if defined(D_WEI_RAISED_BOUNDARY_2) && defined(D_TIME_BOUNDARY_2) && defined(D_BONUS1_RATE_2)
        else if (weiRaised < D_WEI_RAISED_BOUNDARY_2 && startTime < D_TIME_BOUNDARY_2) {
            rate += baseRate * D_BONUS1_RATE_2;
        }
        //#endif

        // apply amount
        //#if defined(D_WEI_AMOUNT_BOUNDARY_1) && defined(D_BONUS2_RATE_1)
        if (weiAmount >= D_WEI_AMOUNT_BOUNDARY_1) {
            rate += rate * D_BONUS2_RATE_1;
        }
        //#endif
        //#if defined(D_WEI_AMOUNT_BOUNDARY_2) && defined(D_BONUS2_RATE_2)
        else if (weiAmount >= D_WEI_AMOUNT_BOUNDARY_2) {
            rate += rate * D_BONUS2_RATE_2;
        }
        //#endif
        //#if defined(D_WEI_AMOUNT_BOUNDARY_3) && defined(D_BONUS2_RATE_3)
        else if (weiAmount >= D_WEI_AMOUNT_BOUNDARY_3) {
            rate += rate * D_BONUS2_RATE_3;
        }
        //#endif
        //#if defined(D_WEI_AMOUNT_BOUNDARY_4) && defined(D_BONUS2_RATE_4)
        else if (weiAmount >= D_WEI_AMOUNT_BOUNDARY_4) {
            rate += rate * D_BONUS2_RATE_4;
        }
        //#endif

        return rate;
    }
}
