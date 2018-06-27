pragma solidity ^0.4.23;

import "sc-library/contracts/ERC223/ERC223Receiver.sol";


contract SuccessfulERC223Receiver is ERC223Receiver {
    event Invoked(address from, uint value, bytes data);

    function tokenFallback(address _from, uint _value, bytes _data) public {
        emit Invoked(_from, _value, _data);
    }
}


contract FailingERC223Receiver is ERC223Receiver {
    function tokenFallback(address, uint, bytes) public {
        revert();
    }
}


contract ERC223ReceiverWithoutTokenFallback {
}
