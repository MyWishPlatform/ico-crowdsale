pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "./MyWishConsts.sol";
import "./MyWishToken.sol";

contract MyWishCrowdsale is usingMyWishConsts, RefundableCrowdsale, CappedCrowdsale {

    function MyWishCrowdsale(uint256 _startTime, uint256 _endTime, uint256 _softCap, uint256 _hardCap)
            CappedCrowdsale(_hardCap)
            RefundableCrowdsale(_softCap)
            Crowdsale(_startTime, _endTime, RATE, COLD_WALLET) {
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
}
