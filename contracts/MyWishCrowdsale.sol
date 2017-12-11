pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "./MyWishConsts.sol";
import "./MyWishToken.sol";

contract MyWishCrowdsale is usingMyWishConsts, RefundableCrowdsale, CappedCrowdsale {

    function MyWishCrowdsale(uint _startTime, uint _endTime)
        Crowdsale(_startTime, _endTime, RATE, COLD_WALLET)
        CappedCrowdsale(HARD_CAP_TOKENS * TOKEN_DECIMAL_MULTIPLIER / RATE)
        RefundableCrowdsale(SOFT_CAP_TOKENS * TOKEN_DECIMAL_MULTIPLIER / RATE)
    {
        require(SOFT_CAP_TOKENS <= HARD_CAP_TOKENS);
    }

    /**
     * @dev override token creation to integrate with MyWish token.
     */
    function createTokenContract() internal returns (MintableToken) {
        return new MyWishToken();
    }

    function addExcluded(address _toExclude) onlyOwner {
        MyWishToken(token).addExcluded(_toExclude);
    }

    // Send ether to the fund collection wallet
    function forwardFunds(uint amountWei) internal {
        wallet.transfer(amountWei);
    }

    function hasStarted() public constant returns (bool) {
        return now >= startTime;
    }

    function finalization() internal {
        super.finalization();
        MyWishToken(token).crowdsaleFinished();
        token.transferOwnership(owner);
    }
}
