pragma solidity ^0.4.0;

contract usingConsts {
    uint constant TOKEN_DECIMALS = DECIMALS;
    uint8 constant TOKEN_DECIMALS_UINT8 = DECIMALS;
    uint constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;

    string constant TOKEN_NAME = "NAME";
    string constant TOKEN_SYMBOL = "SYMBOL";
}
