//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


/**
 * @title ERC223Basic
 * @dev Simpler version of ERC223 interface
 */
abstract contract ERC223Basic is ERC20 {
  // Occurs when tokens transferred.
  event Transfer(address indexed from, address indexed to, uint indexed value, bytes data);

  /**
   * @dev Transfer the specified amount of tokens to the specified address.
   *      Invokes the `tokenFallback` function if the recipient is a contract.
   *      The token transfer fails if the recipient is a contract
   *      but does not implement the `tokenFallback` function
   *      or the fallback function to receive funds.
   *
   * @param _to    Receiver address.
   * @param _value Amount of tokens that will be transferred.
   * @param _data  Transaction metadata.
   */
  function transfer(address _to, uint _value, bytes memory _data) public virtual returns (bool);
}
