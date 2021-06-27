//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../dependencies/sc-library/contracts/ERC223/ERC223Receiver.sol";


contract SuccessfulERC223Receiver is ERC223Receiver {
    event Invoked(address from, uint value, bytes data);

    function tokenFallback(address _from, uint _value, bytes memory _data) public override{
        emit Invoked(_from, _value, _data);
    }
}


contract FailingERC223Receiver is ERC223Receiver {
    function tokenFallback(address, uint, bytes memory) public pure override{
        revert();
    }
}


contract ERC223ReceiverWithoutTokenFallback {
}
