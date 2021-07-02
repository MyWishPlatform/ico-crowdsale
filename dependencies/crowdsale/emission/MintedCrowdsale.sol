//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "dependencies/crowdsale/Crowdsale.sol";
import "dependencies/MintableToken.sol";


/**
 * @title MintedCrowdsale
 * @dev Extension of Crowdsale contract whose tokens are minted in each purchase.
 * Token ownership should be transferred to MintedCrowdsale for minting.
 */
abstract contract MintedCrowdsale is Crowdsale {

  /**
   * @dev Overrides delivery by minting tokens upon purchase.
   * @param _beneficiary Token purchaser
   * @param _tokenAmount Number of tokens to be minted
   */
  function _deliverTokens(
    address _beneficiary,
    uint256 _tokenAmount
  )
    internal virtual override
  {
    require(MintableToken(address(token)).mint(_beneficiary, _tokenAmount));
  }
}
