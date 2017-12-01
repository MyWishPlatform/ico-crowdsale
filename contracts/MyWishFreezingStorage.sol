pragma solidity ^0.4.16;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./MyWishToken.sol";

contract MyWishFreezingStorage is Ownable {
	// Timestamp when token release is enabled
    uint64 public releaseTime;

    MyWishToken token;
    
    function MyWishFreezingStorage(MyWishToken _token, uint64 _releaseTime) { //ERC20Basic
        require(_releaseTime > now);
   		
        releaseTime = _releaseTime;
        token = _token;
    }

    function release(address _beneficiary) onlyOwner returns(uint) {
        //require(now >= releaseTime);
        if (now < releaseTime) return 0;

        uint amount = token.balanceOf(this);
        //require(amount > 0);
        if (amount == 0)  return 0;

        // token.safeTransfer(beneficiary, amount);
        //require(token.transfer(_beneficiary, amount));
        bool result = token.transfer(_beneficiary, amount);
        if (!result) return 0;

        return amount;
    }
}