//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "dependencies/MintableToken.sol";
import "dependencies/sc-library/contracts/ERC223/ERC223Token.sol";


/**
 * @title ERC223MintableToken
 * @dev ERC223 implementation of MintableToken.
 */
contract ERC223MintableToken is MintableToken, ERC223Token {
  /**
   * @dev Function to mint tokens. Invokes token fallback function on recipient address.
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(
    address _to,
    uint256 _amount
  )
    onlyOwner
    canMint
    public override
    returns (bool)
  {
    bytes memory empty;
    _mint(_to, _amount);
    if (_to.isContract()) {
      ERC223Receiver receiver = ERC223Receiver(_to);
      receiver.tokenFallback(address(this), _amount, empty);
    }
    emit Transfer(
      msg.sender,
      _to,
      _amount,
      empty
    );
    return true;
  }
}
