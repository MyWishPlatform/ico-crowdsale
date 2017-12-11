pragma solidity ^0.4.0;


contract usingMyWishConsts {
    uint constant TOKEN_DECIMALS = T_TOKEN_DECIMALS;
    uint8 constant TOKEN_DECIMALS_UINT8 = T_TOKEN_DECIMALS;
    uint constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;
    uint constant RATE = T_RATE; // = 1 ETH = 10^18 wei

    string constant TOKEN_NAME = "T_TOKEN_NAME";
    string constant TOKEN_SYMBOL = "T_TOKEN_SYMBOL";

    address constant COLD_WALLET = T_COLD_WALLET;
    uint constant SOFT_CAP_TOKENS = T_SOFT_CAP_TOKENS;
    uint constant HARD_CAP_TOKENS = T_HARD_CAP_TOKENS;
}
