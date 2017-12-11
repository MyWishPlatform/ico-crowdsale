pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "./MainToken.sol";

contract MainCrowdsale is RefundableCrowdsale, CappedCrowdsale {

    string private token_name;
    string private token_symbol;
    uint private token_decimals;

    function MainCrowdsale(
        uint _startTime,
        uint _endTime,
        uint _soft_cap_tokens,
        uint _hard_cap_tokens,
        uint _rate,
        uint _token_decimals,
        string _token_name,
        string _token_symbol,
        address _cold_wallet_address
    )
        Crowdsale(_startTime, _endTime, _rate, _cold_wallet_address)
        CappedCrowdsale(_hard_cap_tokens * 10 ** _token_decimals / _rate)
        RefundableCrowdsale(_soft_cap_tokens * 10 ** _token_decimals / _rate)
    {
        require(_soft_cap_tokens <= _hard_cap_tokens);
        token_name = _token_name;
        token_symbol = _token_symbol;
        token_decimals = _token_decimals;
    }

    /**
     * @dev override token creation to integrate with MyWish token.
     */
    function createTokenContract() internal returns (MintableToken) {
        return new MainToken(token_name, token_symbol, token_decimals);
    }

    function addExcluded(address _toExclude) onlyOwner {
        MainToken(token).addExcluded(_toExclude);
    }

    // Send ether to the fund collection wallet
    function forwardFunds(uint amountWei) internal {
        wallet.transfer(amountWei);
    }

    function hasStarted() public constant returns (bool) {
        return now >= startTime;
    }

    function finalization() internal {
        super.finalization();
        MainToken(token).crowdsaleFinished();
        token.transferOwnership(owner);
    }
}
