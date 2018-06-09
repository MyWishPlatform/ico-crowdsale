pragma solidity ^0.4.21;

import 'zeppelin-solidity/contracts/token/ERC20Basic.sol';

contract ERC223Basic is ERC20Basic {
    function transfer(address to, uint value, bytes data) public returns (bool);
    event Transfer(address indexed from, address indexed to, uint value, bytes data);
}
