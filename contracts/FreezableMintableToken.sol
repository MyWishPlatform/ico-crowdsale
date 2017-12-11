pragma solidity ^0.4.18;


import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "./FreezableToken.sol";

contract FreezableMintableToken is FreezableToken, MintableToken {
    /**
     * @dev Mint the specified amount of token to the specified address and freeze it until the specified date.
     *      Be careful, gas usage is not deterministic,
     *      and depends on how many freezes _to address already has.
     * @param _to Address to which token will be freeze.
     * @param _amount Amount of token to mint and freeze.
     * @param _until Release date, must be in future.
     */
    function mintAndFreeze(address _to, uint _amount, uint _until) public onlyOwner {
        bytes32 currentKey = toKey(_to, _until);
        mint(address(sha3(currentKey)), _amount);

        freeze(_to, _until);
    }
}