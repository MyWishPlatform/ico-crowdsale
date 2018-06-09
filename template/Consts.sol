pragma solidity ^0.4.21;

contract Consts {
    uint constant TOKEN_DECIMALS = D_DECIMALS;
    uint8 constant TOKEN_DECIMALS_UINT8 = D_DECIMALS;
    uint constant TOKEN_DECIMAL_MULTIPLIER = 10 ** TOKEN_DECIMALS;

    string constant TOKEN_NAME = "D_NAME";
    string constant TOKEN_SYMBOL = "D_SYMBOL";
    bool constant PAUSED = D_PAUSE_TOKENS;
    address constant TARGET_USER = D_CONTRACTS_OWNER;
    //#if !defined(D_ONLY_TOKEN) || D_ONLY_TOKEN != true
    uint constant START_TIME = D_START_TIME;
    //#endif
    bool constant CONTINUE_MINTING = D_CONTINUE_MINTING;
}
