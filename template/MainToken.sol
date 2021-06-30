//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "dependencies/MintableToken.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
//#if "D_ERC" == "ERC223"
import "dependencies/sc-library/contracts/ERC223/ERC223MintableToken.sol";
//#endif
import "./FreezableMintableToken.sol";
import "./Consts.sol";


contract MainToken is Consts, FreezableMintableToken, ERC20Burnable
    //#if "D_ERC" == "ERC223"
    , ERC223MintableToken
    //#endif
{
    //#if defined(D_ONLY_TOKEN) && D_ONLY_TOKEN == true
    event Initialized();
    bool public initialized = false;

    constructor() ERC20(TOKEN_NAME, TOKEN_SYMBOL){
        init();
        transferOwnership(TARGET_USER);
    }
    //#else
    constructor() ERC20(TOKEN_NAME, TOKEN_SYMBOL){

    }
    //#endif

    function decimals() public pure override returns (uint8 _decimals) {
        return TOKEN_DECIMALS_UINT8;
    }

    function balanceOf(address account) public view override(ERC20, FreezableMintableToken) returns (uint256 balance) {
        return FreezableMintableToken.balanceOf(account);
    }

    //#if defined(D_ONLY_TOKEN) && D_ONLY_TOKEN == true
    function init() private {
        require(!initialized);
        initialized = true;


        //#if D_PREMINT_COUNT > 0
        address[D_PREMINT_COUNT] memory addresses = [D_PREMINT_ADDRESSES];
        uint[D_PREMINT_COUNT] memory amounts = [D_PREMINT_AMOUNTS];
        uint64[D_PREMINT_COUNT] memory freezes = [D_PREMINT_FREEZES];

        for (uint i = 0; i < addresses.length; i++) {
            if (freezes[i] == 0) {
                mint(addresses[i], amounts[i]);
            } else {
                mintAndFreeze(addresses[i], amounts[i], freezes[i]);
            }
        }
        //#endif

        if (!CONTINUE_MINTING) {
            finishMinting();
        }

        emit Initialized();
    }
    //#endif
}
