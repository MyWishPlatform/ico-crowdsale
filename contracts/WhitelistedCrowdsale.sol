pragma solidity ^0.4.21;

import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract WhitelistedCrowdsale is Crowdsale, Ownable {
    mapping (address => bool) private whitelist;

    /**
     * @dev throws if buyer is not whitelisted.
     * @param _buyer address
     */
    modifier onlyIfWhitelisted(address _buyer) {
        require(whitelist[_buyer]);
        _;
    }

    /**
     * @dev getter to determine if address is in whitelist
     */
    function isWhitelisted(address _address) public view returns (bool) {
        return whitelist[_address];
    }

    /**
     * @dev override purchase validation to add extra value logic.
     * @return true if sender is whitelisted
     */
    function validPurchase() internal view onlyIfWhitelisted(msg.sender) returns (bool) {
        return super.validPurchase();
    }

    /**
     * @dev add single address to whitelist
     */
    function addAddressToWhitelist(address _address) external onlyOwner {
        whitelist[_address] = true;
    }

    /**
     * @dev add addresses to whitelist
     */
    function addAddressesToWhitelist(address[] _addresses) external onlyOwner {
        for (uint i = 0; i < _addresses.length; i++) {
            whitelist[_addresses[i]] = true;
        }
    }

    /**
     * @dev remove single address from whitelist
     */
    function removeAddressFromWhitelist(address _address) external onlyOwner {
        delete whitelist[_address];
    }

    /**
     * @dev remove addresses from whitelist
     */
    function removeAddressesFromWhitelist(address[] _addresses) external onlyOwner {
        for (uint i = 0; i < _addresses.length; i++) {
            delete whitelist[_addresses[i]];
        }
    }
}
