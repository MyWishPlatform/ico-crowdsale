pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/BurnableToken.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/token/TokenTimelock.sol";

contract MainToken is MintableToken, BurnableToken, Pausable {
    /**
     * @dev Accounts who can transfer token even if paused. Works only during crowdsale.
     */
    mapping(address => bool) excluded;

    string public token_name;
    string public token_symbol;
    uint8 public token_decimals;

    function MainToken(
        string _token_name,
        string _token_symbol,
        uint _token_decimals
    ) {
        token_name = _token_name;
        token_symbol = _token_symbol;
        token_decimals = uint8(_token_decimals);

        pause();
    }

    function name() constant public returns (string _name) {
        return token_name;
    }

    function symbol() constant public returns (string _symbol) {
        return token_symbol;
    }

    function decimals() constant public returns (uint8 _decimals) {
        return token_decimals;
    }

    function crowdsaleFinished() onlyOwner {
        paused = false;
        finishMinting();
    }

    function addExcluded(address _toExclude) onlyOwner {
        excluded[_toExclude] = true;
    }

    function transferFrom(address _from, address _to, uint256 _value) returns (bool _success) {
        require(!paused || excluded[_from]);
        return super.transferFrom(_from, _to, _value);
    }

    function transfer(address _to, uint256 _value) returns (bool _success) {
        require(!paused || excluded[msg.sender]);
        return super.transfer(_to, _value);
    }
}
