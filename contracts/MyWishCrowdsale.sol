pragma solidity ^0.4.0;

import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "./MyWishConsts.sol";
import "./MyWishToken.sol";
import "./MyWishBonusProvider.sol";

contract MyWishCrowdsale is usingMyWishConsts, RefundableCrowdsale, CappedCrowdsale {

    MyWishBonusProvider public bonusProvider;

    /**
     * @dev Amount of already sold tokens.
     */
    uint public soldTokens;

    bool private isInit = false;

    function MyWishCrowdsale(uint _startTime, uint _endTime, uint _softCap, uint _hardCap)
            Crowdsale(_startTime, _endTime, RATE, COLD_WALLET)
            CappedCrowdsale(_hardCap)
            RefundableCrowdsale(_softCap)
    {
        require(_softCap <= _hardCap);
    }

    /**
     * @dev Initialization of crowdsale. Starts once after deployment token contract
     * , deployment crowdsale contract and changу token contract's owner
     */
    function init() onlyOwner public returns(bool) {
        require(!isInit);

        MyWishToken ertToken = MyWishToken(token);
        isInit = true;

        MyWishBonusProvider bProvider = new MyWishBonusProvider(ertToken, COLD_WALLET);
        // bProvider.transferOwnership(owner);
        bonusProvider = bProvider;

//        mintToFounders(ertToken);

//        require(token.mint(INVESTOR_ADDRESS, INVESTOR_TOKENS));
//        require(token.mint(COMPANY_COLD_STORAGE_ADDRESS, COMPANY_COLD_STORAGE_TOKENS));
//        require(token.mint(PRE_SALE_ADDRESS, PRE_SALE_TOKENS));

        // bonuses
//        require(token.mint(BONUS_ADDRESS, BONUS_TOKENS));
//        require(token.mint(bonusProvider, BUFFER_TOKENS)); // mint bonus token to bonus provider

//        ertToken.addExcluded(INVESTOR_ADDRESS);
//        ertToken.addExcluded(BONUS_ADDRESS);
//        ertToken.addExcluded(COMPANY_COLD_STORAGE_ADDRESS);
//        ertToken.addExcluded(PRE_SALE_ADDRESS);

        ertToken.addExcluded(address(bonusProvider));

        return true;
    }

    /**
     * @dev override token creation to integrate with MyWish token.
     */
    function createTokenContract() internal returns (MintableToken) {
        return new MyWishToken();
    }

    function addExcluded(address _toExclude) onlyOwner {
        MyWishToken(token).addExcluded(_toExclude);
    }

    // Low level token purchase function
//    function buyTokens(address beneficiary) payable {
//        require(beneficiary != 0x0);
//        uint amountWei = msg.value;
//
//        // Total minted tokens
//        uint totalSupply = token.totalSupply();
//
//        // Actual token minting rate (with considering bonuses and discounts)
//        uint actualRate = rate;
//
//        require(validPurchase(amountWei, actualRate, totalSupply));
//
//        // Calculate token amount to be created
//        // uint tokens = rate.mul(msg.value).div(1 ether);
//        uint tokens = amountWei.mul(actualRate);
//
//        if (msg.value == 0) { // if it is a btc purchase then check existence all tokens (no change)
//            require(tokens.add(totalSupply) <= cap);
//        }
//
//        // Change, if minted token would be less
//        uint change = 0;
//
//        // If hard cap reached
//        if (tokens.add(totalSupply) > cap) {
//            // Rest tokens
//            uint maxTokens = cap.sub(totalSupply);
//            uint realAmount = maxTokens.div(actualRate);
//
//            // Rest tokens rounded by actualRate
//            tokens = realAmount.mul(actualRate);
//            change = amountWei.sub(realAmount);
//            amountWei = realAmount;
//        }
//
//        // Bonuses
//        postBuyTokens(beneficiary, tokens);
//
//        // Update state
//        weiRaised = weiRaised.add(amountWei);
//        soldTokens = soldTokens.add(tokens);
//
//        token.mint(beneficiary, tokens);
//        TokenPurchase(msg.sender, beneficiary, amountWei, tokens);
//
//        if (msg.value != 0) {
//            if (change != 0) {
//                msg.sender.transfer(change);
//            }
//            forwardFunds(amountWei);
//        }
//    }

    // Send ether to the fund collection wallet
    // Override to create custom fund forwarding mechanisms
    function forwardFunds(uint amountWei) internal {
        wallet.transfer(amountWei);
    }

    /**
     * @dev Release delayed bonus tokens
     * @return Amount of got bonus tokens
     */
    function releaseBonus() returns(uint) {
        return bonusProvider.releaseBonus(msg.sender, soldTokens);
    }

    /**
     * @dev Transfer bonuses and adding delayed bonuses
     * @param _beneficiary Future bonuses holder
     * @param _tokens Amount of bonus tokens
     */
    function postBuyTokens(address _beneficiary, uint _tokens) internal {
        uint bonuses = bonusProvider.getBonusAmount(_beneficiary, soldTokens, _tokens, startTime);
        bonusProvider.addDelayedBonus(_beneficiary, soldTokens, _tokens);

        if (bonuses > 0) {
            bonusProvider.sendBonus(_beneficiary, bonuses);
        }
    }

    /**
     * @dev Check if the specified purchase is valid.
     * @return true if the transaction can buy tokens
     */
    function validPurchase(uint _amountWei, uint _actualRate, uint _totalSupply) internal constant returns (bool) {
        bool withinPeriod = now >= startTime && now <= endTime;
        bool nonZeroPurchase = _amountWei != 0;
        bool hardCapNotReached = _totalSupply <= cap.sub(_actualRate);

        return withinPeriod && nonZeroPurchase && hardCapNotReached;
    }
}
