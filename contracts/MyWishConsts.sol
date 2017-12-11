pragma solidity ^0.4.0;


contract usingMyWishConsts {
    uint constant TOKEN_DECIMALS = 18;
    uint8 constant TOKEN_DECIMALS_UINT8 = 18;
    uint constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;
    uint constant RATE = 250; // = 1 ETH = 10^18 wei

    string constant TOKEN_NAME = "MyWish Token";
    string constant TOKEN_SYMBOL = "WISH";

    address constant COLD_WALLET = 0x80826b5b717aDd3E840343364EC9d971FBa3955C;
    uint constant SOFT_CAP_TOKENS = 1000000;
    uint constant HARD_CAP_TOKENS = 22000000;
}

