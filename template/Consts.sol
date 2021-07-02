//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


contract Consts {
    uint public constant TOKEN_DECIMALS = D_DECIMALS;
    uint8 public constant TOKEN_DECIMALS_UINT8 = D_DECIMALS;
    uint public constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;

    string public constant TOKEN_NAME = "D_NAME";
    string public constant TOKEN_SYMBOL = "D_SYMBOL";
    address public constant TARGET_USER = D_CONTRACTS_OWNER;
    //#if !defined(D_ONLY_TOKEN) || D_ONLY_TOKEN != true
    uint public constant START_TIME = D_START_TIME;
    //#endif
    bool public constant CONTINUE_MINTING = D_CONTINUE_MINTING;
}
