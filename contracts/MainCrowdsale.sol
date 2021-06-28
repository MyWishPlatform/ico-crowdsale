//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "dependencies/crowdsale/distribution/FinalizableCrowdsale.sol";
import "dependencies/crowdsale/validation/CappedCrowdsale.sol";
import "dependencies/crowdsale/emission/MintedCrowdsale.sol";
import "dependencies/MintableToken.sol";
import "./MainToken.sol";
import "./Consts.sol";


abstract contract MainCrowdsale is Consts, FinalizableCrowdsale, MintedCrowdsale, CappedCrowdsale {
    function hasStarted() public view returns (bool) {
        return block.timestamp >= openingTime;
    }

    function startTime() public view returns (uint256) {
        return openingTime;
    }

    function endTime() public view returns (uint256) {
        return closingTime;
    }

    function hasClosed() public virtual override view returns (bool) {
        return super.hasClosed() || capReached();
    }

    function hasEnded() public view returns (bool) {
        return hasClosed();
    }

    function finalization() internal override virtual {
        super.finalization();

        if (!CONTINUE_MINTING) {
            require(MintableToken(address(token)).finishMinting());
        }

        Ownable(address(token)).transferOwnership(TARGET_USER);
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param _weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 _weiAmount)
        internal override virtual view returns (uint256)
    {
        return (_weiAmount * rate) / (1 ether);
    }

    function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal virtual override(Crowdsale, MintedCrowdsale) {
        MintedCrowdsale._deliverTokens(_beneficiary, _tokenAmount);
    }

    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal virtual override(Crowdsale, CappedCrowdsale,TimedCrowdsale) onlyWhileOpen{
        CappedCrowdsale._preValidatePurchase(_beneficiary, _weiAmount);
    }
}
