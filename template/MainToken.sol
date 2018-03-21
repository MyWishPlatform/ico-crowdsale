pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/BurnableToken.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "./FreezableMintableToken.sol";
import "./Consts.sol";
import "./ERC223Token.sol";

contract MainToken is Consts, FreezableMintableToken, BurnableToken, Pausable
    //#if "D_ERC" == "ERC223"
    , ERC223Token
    //#endif
{
    //#if defined(D_ONLY_TOKEN) && D_ONLY_TOKEN == true
    event Initialized();
    bool public initialized = false;

    function MainToken() public {
        init();
        transferOwnership(TARGET_USER);
    }

    function init() private {
        require(!initialized);
        initialized = true;

        if (PAUSED) {
            pause();
        }

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

        Initialized();
    }
    //#endif

    function name() pure public returns (string _name) {
        return TOKEN_NAME;
    }

    function symbol() pure public returns (string _symbol) {
        return TOKEN_SYMBOL;
    }

    function decimals() pure public returns (uint8 _decimals) {
        return TOKEN_DECIMALS_UINT8;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool _success) {
        require(!paused);
        return super.transferFrom(_from, _to, _value);
    }

    function transfer(address _to, uint256 _value) public returns (bool _success) {
        require(!paused);
        return super.transfer(_to, _value);
    }
}
