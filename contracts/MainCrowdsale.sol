pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol";
import "./MainToken.sol";
import "./Consts.sol";

contract MainCrowdsale is usingConsts, FinalizableCrowdsale {
    function hasStarted() public constant returns (bool) {
        return now >= startTime;
    }

    /**
     * @dev override token creation to integrate with MyWish token.
     */
    function createTokenContract() internal returns (MintableToken) {
        return new MainToken();
    }

    function finalization() internal {
        super.finalization();
        if (PAUSED) {
            MainToken(token).unpause();
        }
        token.finishMinting();
        token.transferOwnership(TARGET_USER);
    }
}
