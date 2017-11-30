pragma solidity ^0.4.16;

import "./MyWillConsts.sol";
import "./zeppelin/ownership/Ownable.sol";
import "./MyWillRateProvider.sol";

contract TestRateProvider is usingMyWillConsts, MyWillRateProviderI, Ownable {
    // rate calculate accuracy
    uint constant RATE_SCALE = 10000;
    uint constant STEP_30 = 2000000 * TOKEN_DECIMAL_MULTIPLIER;
    uint constant STEP_20 = 4000000 * TOKEN_DECIMAL_MULTIPLIER;
    uint constant STEP_10 = 6000000 * TOKEN_DECIMAL_MULTIPLIER;
    uint constant RATE_30 = 1950 * RATE_SCALE;
    uint constant RATE_20 = 1800 * RATE_SCALE;
    uint constant RATE_10 = 1650 * RATE_SCALE;
    uint constant BASE_RATE = 1500 * RATE_SCALE;

    struct ExclusiveRate {
    // be careful, accuracies this about 15 minutes
    uint32 workUntil;
    // exclusive rate or 0
    uint rate;
    // rate bonus percent, which will be divided by 1000 or 0
    uint16 bonusPercent1000;
    // flag to check, that record exists
    bool exists;
    }

    mapping(address => ExclusiveRate) exclusiveRate;

    function getRateScale() public constant returns (uint) {
        return RATE_SCALE;
    }

    function getRate(address buyer, uint totalSold, uint amountWei) public constant returns (uint) {
        uint rate;
        // apply sale
        if (totalSold < STEP_30) {
            rate = RATE_30;
        }
        else if (totalSold < STEP_20) {
            rate = RATE_20;
        }
        else if (totalSold < STEP_10) {
            rate = RATE_10;
        }
        else {
            rate = BASE_RATE;
        }

        // apply bonus for amount
        if (amountWei >= 1 ether) {
            rate += rate * 13 / 100;
        }
        else if (amountWei >= 0.5 ether) {
            rate += rate * 10 / 100;
        }
        else if (amountWei >= 0.1 ether) {
            rate += rate * 7 / 100;
        }
        else if (amountWei >= 0.05 ether) {
            rate += rate * 5 / 100;
        }
        else if (amountWei >= 0.03 ether) {
            rate += rate * 4 / 100;
        }
        else if (amountWei >= 0.01 ether) {
            rate += rate * 25 / 1000;
        }

        ExclusiveRate memory eRate = exclusiveRate[buyer];
        if (eRate.exists && eRate.workUntil >= now) {
            if (eRate.rate != 0) {
                rate = eRate.rate;
            }
            rate += rate * eRate.bonusPercent1000 / 1000;
        }
        return rate;
    }

    function setExclusiveRate(address _investor, uint _rate, uint16 _bonusPercent1000, uint32 _workUntil) onlyOwner {
        exclusiveRate[_investor] = ExclusiveRate(_workUntil, _rate, _bonusPercent1000, true);
    }

    function removeExclusiveRate(address _investor) onlyOwner {
        delete exclusiveRate[_investor];
    }
}