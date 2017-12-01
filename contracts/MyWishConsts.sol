pragma solidity ^0.4.0;


contract usingMyWishConsts {
    uint constant TOKEN_DECIMALS = 18;
    uint8 constant TOKEN_DECIMALS_UINT8 = 18;
    uint constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;
    uint constant RATE = 240; // = 1 ETH

    string constant TOKEN_NAME = "MyWish Token";
    string constant TOKEN_SYMBOL = "WISH";

    address constant COLD_WALLET = 0x123;
}
