//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "dependencies/MintableToken.sol";
import "./FreezableToken.sol";


abstract contract FreezableMintableToken is FreezableToken, MintableToken {
    /**
     * @dev Mint the specified amount of token to the specified address and freeze it until the specified date.
     *      Be careful, gas usage is not deterministic,
     *      and depends on how many freezes _to address already has.
     * @param _to Address to which token will be freeze.
     * @param _amount Amount of token to mint and freeze.
     * @param _until Release date, must be in future.
     * @return A boolean that indicates if the operation was successful.
     */
    function mintAndFreeze(address _to, uint _amount, uint64 _until) public onlyOwner canMint returns (bool) {

        bytes32 currentKey = toKey(_to, _until);
        freezings[currentKey] = freezings[currentKey] + _amount;
        freezingBalance[_to] = freezingBalance[_to] + _amount;

        freeze(_to, _until);
        emit Mint(_to, _amount);
        emit Freezed(_to, _until, _amount);
        emit Transfer(msg.sender, _to, _amount);
        return true;
    }

    function balanceOf(address _owner) public view virtual override(ERC20, FreezableToken) returns (uint256 balance) {
        return FreezableToken.balanceOf(_owner);
    }
}
