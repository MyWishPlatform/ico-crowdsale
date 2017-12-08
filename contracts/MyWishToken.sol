pragma solidity ^0.4.0;

import "./MyWishConsts.sol";
import "./MyWishFreezingStorage.sol";
import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/PausableToken.sol";
import "zeppelin-solidity/contracts/token/TokenTimelock.sol";

contract MyWishToken is usingMyWishConsts, MintableToken, BurnableToken, PausableToken {

    event MintTimelocked(address indexed beneficiary, uint amount);

    /**
     * @dev Accounts who can transfer token even if paused. Works only during crowdsale.
     */
    mapping(address => bool) excluded;

    mapping (address => MyWishFreezingStorage[]) public frozenFunds;

    function MyWishToken() {
        pause();
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

    /**
     * @dev Mint timelocked tokens
     */
    function mintTimelocked(
        address _to,
        uint _amount,
        uint32 _releaseTime
    ) onlyOwner canMint returns (MyWishFreezingStorage) {
        MyWishFreezingStorage timelock = new MyWishFreezingStorage(this, _releaseTime);
        mint(timelock, _amount);

        frozenFunds[_to].push(timelock);
        addExcluded(timelock);

        MintTimelocked(_to, _amount);

        return timelock;
    }

    /**
     * @dev Release frozen tokens
     * @return Total amount of released tokens
     */
    function returnFrozenFreeFunds() public returns (uint) {
        uint total = 0;
        MyWishFreezingStorage[] storage frozenStorages = frozenFunds[msg.sender];
        for (uint x = 0; x < frozenStorages.length; x++) {
            uint amount = frozenStorages[x].release(msg.sender);
            total = total.add(amount);
        }

        return total;
    }
}
