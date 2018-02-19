pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/BurnableToken.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/token/TokenTimelock.sol";
import "./FreezableMintableToken.sol";
import "./Consts.sol";

contract MainToken is usingConsts, FreezableMintableToken, BurnableToken, Pausable {
    function MainToken() {
    }

    function name() constant public returns (string _name) {
        return TOKEN_NAME;
    }

    function symbol() constant public returns (string _symbol) {
        return TOKEN_SYMBOL;
    }

    function decimals() constant public returns (uint8 _decimals) {
        return TOKEN_DECIMALS_UINT8;
    }

    function transferFrom(address _from, address _to, uint256 _value) returns (bool _success) {
        require(!paused);
        return super.transferFrom(_from, _to, _value);
    }

    function transfer(address _to, uint256 _value) returns (bool _success) {
        require(!paused);
        return super.transfer(_to, _value);
    }
}
