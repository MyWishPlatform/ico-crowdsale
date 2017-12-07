pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "./MyWishConsts.sol";
import "./MyWishToken.sol";

contract MyWishCrowdsale is usingMyWishConsts, RefundableCrowdsale, CappedCrowdsale {

    function MyWishCrowdsale(uint _startTime, uint _endTime, uint _softCap, uint _hardCap)
            Crowdsale(_startTime, _endTime, RATE, COLD_WALLET)
            CappedCrowdsale(_hardCap)
            RefundableCrowdsale(_softCap)
    {
        require(_softCap <= _hardCap);
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
    // Override to create custom fund forwarding mechanisms
    function forwardFunds(uint amountWei) internal {
        wallet.transfer(amountWei);
    }

    function hasStarted() public constant returns (bool) {
        return now >= startTime;
    }
}
