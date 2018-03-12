pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/BurnableToken.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "./FreezableMintableToken.sol";
import "./Consts.sol";
import "./ERC223Token.sol";

contract MainToken is usingConsts, FreezableMintableToken, BurnableToken, Pausable
    //#if "D_ERC" == 223
    , ERC223Token
    //#endif
{
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
