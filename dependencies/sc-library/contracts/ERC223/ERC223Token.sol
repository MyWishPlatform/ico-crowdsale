//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Address.sol";
import "./ERC223Basic.sol";
import "./ERC223Receiver.sol";


/**
 * @title Reference implementation of the ERC223 standard token.
 */
abstract contract ERC223Token is ERC223Basic, ERC223Receiver {
  using Address for address;

  /**
   * @dev Token should not accept tokens
   */
  function tokenFallback(address, uint, bytes memory) public pure override{
    revert();
  }

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
  function transfer(address _to, uint _value, bytes memory _data) public override returns (bool) {
    // Standard function transfer similar to ERC20 transfer with no _data .
    // Added due to backwards compatibility reasons .
    _transfer(msg.sender, _to, _value);
    if (_to.isContract()) {
      ERC223Receiver receiver = ERC223Receiver(_to);
      receiver.tokenFallback(msg.sender, _value, _data);
    }
    emit Transfer(
      msg.sender,
      _to,
      _value,
      _data
    );
    return true;
  }

  /**
   * @dev Transfer the specified amount of tokens to the specified address.
   *      This function works the same with the previous one
   *      but doesn't contain `_data` param.
   *      Added due to backwards compatibility reasons.
   *
   * @param _to    Receiver address.
   * @param _value Amount of tokens that will be transferred.
   */
  function transfer(address _to, uint256 _value) public override returns (bool) {
    bytes memory empty;
    return transfer(_to, _value, empty);
  }
}
