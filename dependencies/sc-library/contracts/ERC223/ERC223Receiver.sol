//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


/**
* @title Contract that will work with ERC223 tokens.
*/
abstract contract ERC223Receiver {
  /**
   * @dev Standard ERC223 function that will handle incoming token transfers.
   *
   * @param _from  Token sender address.
   * @param _value Amount of tokens.
   * @param _data  Transaction metadata.
   */
  function tokenFallback(address _from, uint _value, bytes memory _data) public virtual;
}
