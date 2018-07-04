const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { timeTo, increaseTime, revert, snapshot } = require('sc-library/test-utils/evmMethods');
const { web3async, estimateConstructGas } = require('sc-library/test-utils/web3Utils');

const Crowdsale = artifacts.require('./TemplateCrowdsale.sol');
const Token = artifacts.require('./MainToken.sol');
//#if D_SOFT_CAP_WEI != 0
const RefundVault = artifacts.require('./RefundVault.sol');
//#endif

const BASE_RATE = new BigNumber('D_RATE');
const SOFT_CAP_WEI = new BigNumber('D_SOFT_CAP_WEI');
const HARD_CAP_WEI = new BigNumber('D_HARD_CAP_WEI');
const START_TIME = D_START_TIME; // eslint-disable-line no-undef
const END_TIME = D_END_TIME; // eslint-disable-line no-undef
const TOKEN_DECIMAL_MULTIPLIER = new BigNumber(10).toPower(D_DECIMALS); // eslint-disable-line no-undef
const ETHER = web3.toWei(1, 'ether');
const GAS_PRICE = web3.toWei(100, 'gwei');

//#if D_BONUS_TOKENS

/**
 * Mapping string to number, eg:
 * 'uint(18000000000000000000)' to 18000000000000000000
 */
const extractBigNumber = (string) => new BigNumber(string.match(/\((\d+)\)/)[1]);

//#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
const weiRaisedStartsBounds = 'D_WEI_RAISED_STARTS_BOUNDARIES'.split(',').map(extractBigNumber);
const weiRaisedEndsBounds = 'D_WEI_RAISED_ENDS_BOUNDARIES'.split(',').map(extractBigNumber);
const timeStartsBoundaries = 'D_TIME_STARTS_BOUNDARIES'.split(',').map(extractBigNumber);
const timeEndsBoundaries = 'D_TIME_ENDS_BOUNDARIES'.split(',').map(extractBigNumber);
const weiRaisedAndTimeRates = 'D_WEI_RAISED_AND_TIME_MILLIRATES'.split(',').map(extractBigNumber);
//#endif

//#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
const weiAmountBoundaries = 'D_WEI_AMOUNT_BOUNDARIES'.split(',').map(extractBigNumber);
const weiAmountRates = 'D_WEI_AMOUNT_MILLIRATES'.split(',').map(extractBigNumber);
//#endif
//#endif

//#if defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
const MIN_VALUE_WEI = new BigNumber('D_MIN_VALUE_WEI');
//#endif

//#if defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
const MAX_VALUE_WEI = new BigNumber('D_MAX_VALUE_WEI');
//#endif

contract('TemplateCrowdsale', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const BUYER_2 = accounts[2];
    const BUYER_3 = accounts[3];
    const COLD_WALLET = accounts[4];
    const TARGET_USER = accounts[5];

    let now;
    let snapshotId;

    const createCrowdsale = async () => {
        const token = await Token.new();
        const crowdsale = await Crowdsale.new(token.address);
        await token.transferOwnership(crowdsale.address);
        await crowdsale.init();
        return crowdsale;
    };

    const getBlockchainTimestamp = async () => {
        const latestBlock = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        return latestBlock.timestamp;
    };

    const getRate = async (weiAmount, crowdsale) => {
        let rate = BASE_RATE.mul(TOKEN_DECIMAL_MULTIPLIER);

        //#if D_BONUS_TOKENS
        const now = new BigNumber(await getBlockchainTimestamp());
        const weiRaised = await crowdsale.weiRaised();

        //#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
        for (let i = 0; i < weiRaisedStartsBounds.length; i++) {
            const weiRaisedInBound = weiRaisedStartsBounds[i].lte(weiRaised) && weiRaised.lt(weiRaisedEndsBounds[i]);
            const timeInBound = timeStartsBoundaries[i].lte(now) && now.lt(timeEndsBoundaries[i]);
            if (weiRaisedInBound && timeInBound) {
                rate = rate.add(rate.mul(weiRaisedAndTimeRates[i]).div(1000).floor());
            }
        }
        //#endif

        //#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
        for (let i = 0; i < weiAmountBoundaries.length; i++) {
            if (weiAmount.gte(weiAmountBoundaries[i])) {
                rate = rate.add(rate.mul(weiAmountRates[i]).div(1000).floor());
                break;
            }
        }
        //#endif
        //#endif
        return rate;
    };

    const tokensForWei = async (weiAmount, crowdsale) => {
        return (await getRate(weiAmount, crowdsale)).mul(weiAmount).div(ETHER).floor();
    };

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        now = await getBlockchainTimestamp();
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#0 gas usage', async () => {
        const token = await Token.new();
        await estimateConstructGas(Crowdsale, token.address)
            .then(console.info);
    });

    it('#0 balances', () => {
        accounts.forEach((account, index) => {
            web3.eth.getBalance(account, function (_, balance) {
                const etherBalance = web3.fromWei(balance, 'ether');
                console.info(`Account ${index} (${account}) balance is ${etherBalance}`);
            });
        });
    });

    it('#0 3/4 precheck', async () => {
        OWNER.should.be.equals('D_MYWISH_ADDRESS', 'it must be the same');
        COLD_WALLET.should.be.equals('D_COLD_WALLET', 'it must be the same');
        TARGET_USER.should.be.equals('D_CONTRACTS_OWNER', 'it must be the same');
    });

    it('#1 construct', async () => {
        const crowdsale = await createCrowdsale();
        await crowdsale.token().then(console.info);
        await crowdsale.token().should.eventually.have.length(42);
    });

    it('#2 check started', async () => {
        const crowdsale = await createCrowdsale();
        let hasStarted = await crowdsale.hasStarted();
        hasStarted.should.be.equals(false, 'crowdsale should be not started yet.');

        await increaseTime(START_TIME - now);
        hasStarted = await crowdsale.hasStarted();
        hasStarted.should.be.equals(true, 'crowdsale should be started after timeshift.');
    });

    it('#3 check finished', async () => {
        const crowdsale = await createCrowdsale();
        let hasStarted = await crowdsale.hasStarted();
        let hasEnded = await crowdsale.hasEnded();

        hasStarted.should.be.equals(false, 'hasStarted before timeshift');
        hasEnded.should.be.equals(false, 'hasEnded before timeshift');

        await timeTo(END_TIME + 1);

        hasStarted = await crowdsale.hasStarted();
        hasEnded = await crowdsale.hasEnded();

        hasStarted.should.be.equals(true, 'hasStarted after timeshift');
        hasEnded.should.be.equals(true, 'hasEnded after timeshift');
    });

    it('#4 check simple buy token', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);
        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });
        //#endif

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif

        //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(BigNumber.min(wei, MAX_VALUE_WEI), MIN_VALUE_WEI);
        //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = BigNumber.min(wei, MAX_VALUE_WEI);
        //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        //#endif

        const expectedTokens = await tokensForWei(wei, crowdsale);

        const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei });
        const token = Token.at(await crowdsale.token());
        const actualTokens = (await token.balanceOf(BUYER_1));
        actualTokens.should.be.bignumber.equal(expectedTokens);

        let balance;
        //#if D_SOFT_CAP_WEI == 0
        balance = (await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET)).sub(coldWalletSourceBalance);
        //#else
        const vault = RefundVault.at(await crowdsale.vault());
        balance = await web3async(web3.eth, web3.eth.getBalance, vault.address);
        //#endif
        balance.should.be.bignumber.equal(wei, 'money should be on vault');
    });

    it('#5 check buy tokens before ICO', async () => {
        const crowdsale = await createCrowdsale();

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });
        //#endif

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif
        //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(BigNumber.min(wei, MAX_VALUE_WEI), MIN_VALUE_WEI);
        //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = BigNumber.min(wei, MAX_VALUE_WEI);
        //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        //#endif
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei }).should.eventually.be.rejected;
    });

    //#if !defined(D_MAX_VALUE_WEI) || ((defined(D_MAX_VALUE_WEI) && (D_HARD_CAP_WEI/D_MAX_VALUE_WEI) < 1000))
    it('#6 check hard cap', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(BUYER_3, { from: TARGET_USER });
        //#endif

        let wei = HARD_CAP_WEI;
        //#if defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = MAX_VALUE_WEI;
        for (let i = 0; i < HARD_CAP_WEI.div(wei).floor(); i++) {
            await crowdsale.sendTransaction({ from: BUYER_3, value: wei });
        }

        const remainWeiToHardCap = HARD_CAP_WEI.sub(await crowdsale.weiRaised());
        if (remainWeiToHardCap.comparedTo(0) > 0) {
            //#if defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
            if (remainWeiToHardCap.comparedTo(MIN_VALUE_WEI) >= 0) {
                await crowdsale.sendTransaction({ from: BUYER_3, value: remainWeiToHardCap });
            }
            //#else
            await crowdsale.sendTransaction({ from: BUYER_3, value: remainWeiToHardCap });
            //#endif
        }
        //#else
        await crowdsale.sendTransaction({ from: BUYER_3, value: wei });
        //#endif
        await crowdsale.hasEnded().should.eventually.be.true;
    });
    //#endif

    //#if defined(D_MAX_VALUE_WEI) && (D_MAX_VALUE_WEI > D_HARD_CAP_WEI)
    it('#7 check buy more hardCap', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(BUYER_3, { from: TARGET_USER });
        //#endif

        const eth = HARD_CAP_WEI.add(web3.toWei(1, 'ether'));

        await crowdsale.sendTransaction({ from: BUYER_3, value: eth }).should.eventually.be.rejected;
    });
    //#endif

    it('#8 check finish crowdsale after time', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - now);

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(OWNER, { from: TARGET_USER });
        //#endif

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif

        //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(BigNumber.min(wei, MAX_VALUE_WEI), MIN_VALUE_WEI);
        //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = BigNumber.min(wei, MAX_VALUE_WEI);
        //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        //#endif

        // send some tokens
        await crowdsale.send(wei);

        // try to finalize before the END
        await crowdsale.finalize({ from: TARGET_USER }).should.eventually.be.rejected;

        await increaseTime(END_TIME - START_TIME + 1);
        // finalize after the END time
        await crowdsale.finalize({ from: TARGET_USER });
        // try to transfer some tokens (it should work now)
        const tokens = await tokensForWei(wei, crowdsale);

        //#if D_CONTINUE_MINTING
        await token.mint(BUYER_2, tokens, { from: TARGET_USER });
        (await token.balanceOf(BUYER_2)).should.be.bignumber.equals(tokens, 'balanceOf just minted tokens must be');
        //#else
        // mint must be disabled
        await token.mint(BUYER_2, tokens, { from: TARGET_USER }).should.eventually.be.rejected;
        await token.mintingFinished().should.eventually.be.true;

        await token.transfer(BUYER_1, tokens);
        (await token.balanceOf(BUYER_1)).should.be.bignumber.equals(tokens, 'balanceOf buyer must be');
        //#endif
        await token.owner().should.eventually.be.equals(TARGET_USER, 'token owner must be TARGET_USER, not OWNER');
    });

    it('#9 check tokens locking', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - now);

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(OWNER, { from: TARGET_USER });
        //#endif

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif

        //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(BigNumber.min(wei, MAX_VALUE_WEI), MIN_VALUE_WEI);
        //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = BigNumber.min(wei, MAX_VALUE_WEI);
        //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        //#endif

        await crowdsale.send(wei);

        // check transferable before end
        //#if D_PAUSE_TOKENS
        await token.transfer(BUYER_1, (await tokensForWei(wei, crowdsale)).div(2)).should.eventually.be.rejected;
        //#else
        await token.transfer(BUYER_1, (await tokensForWei(wei, crowdsale)).div(2));
        //#endif
    });

    //#if !defined(D_MAX_VALUE_WEI) || ((defined(D_MAX_VALUE_WEI) && (D_HARD_CAP_WEI/D_MAX_VALUE_WEI) < 1000))
    it('#10 check finish crowdsale because hardcap', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - now);

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(BUYER_3, { from: TARGET_USER });
        //#endif

        // reach hard cap
        let wei = HARD_CAP_WEI;
        //#if defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = MAX_VALUE_WEI;
        for (let i = 0; i < HARD_CAP_WEI.div(wei).floor(); i++) {
            await crowdsale.sendTransaction({ from: BUYER_3, value: wei });
        }

        const remainWeiToHardCap = HARD_CAP_WEI.sub(await crowdsale.weiRaised());
        if (remainWeiToHardCap.comparedTo(0) > 0) {
            //#if defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
            if (remainWeiToHardCap.comparedTo(MIN_VALUE_WEI) >= 0) {
                await crowdsale.sendTransaction({ from: BUYER_3, value: remainWeiToHardCap });
            }
            //#else
            await crowdsale.sendTransaction({ from: BUYER_3, value: remainWeiToHardCap });
            //#endif
        }
        //#else
        await crowdsale.sendTransaction({ from: BUYER_3, value: wei });
        //#endif

        // finalize
        await crowdsale.finalize({ from: TARGET_USER });
        await token.owner().should.eventually.be.equals(TARGET_USER, 'token owner must be TARGET_USER, not OWNER');
    });
    //#endif

    it('#11 check finish crowdsale because time', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(END_TIME - now);

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(OWNER, { from: TARGET_USER });
        //#endif

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif

        //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(BigNumber.min(wei, MAX_VALUE_WEI), MIN_VALUE_WEI);
        //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = BigNumber.min(wei, MAX_VALUE_WEI);
        //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        //#endif
        await crowdsale.send(wei).should.eventually.be.rejected;
    });

    //#if D_BONUS_TOKENS == true
    it('#12 check buy tokens with bonuses', async () => {
        const checkBuyTokensWithTimeIncreasing = async (buyer, weiAmount, atTime) => {
            weiAmount = new BigNumber(weiAmount);

            //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
            weiAmount = BigNumber.max(BigNumber.min(weiAmount, MAX_VALUE_WEI), MIN_VALUE_WEI);
            //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
            weiAmount = BigNumber.min(weiAmount, MAX_VALUE_WEI);
            //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
            weiAmount = BigNumber.min(weiAmount, MIN_VALUE_WEI);
            //#endif

            await revert(snapshotId);
            snapshotId = (await snapshot()).result;

            const crowdsale = await createCrowdsale();
            if (atTime) {
                await timeTo(atTime);
            }

            //#if D_WHITELIST_ENABLED
            await crowdsale.addAddressToWhitelist(buyer, { from: TARGET_USER });
            //#endif

            const expectedTokens = await tokensForWei(weiAmount, crowdsale);
            const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
            await crowdsale.sendTransaction({ from: buyer, value: weiAmount });

            const token = Token.at(await crowdsale.token());
            (await token.balanceOf(buyer)).should.be.bignumber.equal(expectedTokens);

            let balance;
            //#if D_SOFT_CAP_WEI == 0
            balance = (await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET)).sub(coldWalletSourceBalance);
            //#else
            const vault = RefundVault.at(await crowdsale.vault());
            balance = await web3async(web3.eth, web3.eth.getBalance, vault.address);
            //#endif

            balance.should.be.bignumber.equal(weiAmount, 'money should be on vault');
        };

        //#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
        for (let i = 0; i < timeStartsBoundaries.length; i++) {
            let wei = HARD_CAP_WEI.div(timeStartsBoundaries.length + 1).floor();
            await checkBuyTokensWithTimeIncreasing(BUYER_1, wei, timeStartsBoundaries[i]);
        }
        //#endif

        //#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
        for (let i = 0; i < weiAmountBoundaries.length; i++) {
            let wei = weiAmountBoundaries[i];
            if (wei.equals(0)) {
                wei = 1;
            }
            await checkBuyTokensWithTimeIncreasing(BUYER_3, wei, START_TIME);
        }
        //#endif
    });
    //#endif

    //#if D_SOFT_CAP_WEI != 0
    it('#13 check refund before time and after it if goal did not reached', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - await getBlockchainTimestamp() + 1);
        await crowdsale.claimRefund().should.eventually.be.rejected;

        await increaseTime(END_TIME - await getBlockchainTimestamp() + 1);
        await crowdsale.claimRefund().should.eventually.be.rejected;
    });

    //#if defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI < D_SOFT_CAP_WEI
    it('#14 check success refund', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);

        let wei = SOFT_CAP_WEI.div(2).floor();

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(BUYER_3, { from: TARGET_USER });
        //#endif

        //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(BigNumber.min(wei, MAX_VALUE_WEI), MIN_VALUE_WEI);
        //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = BigNumber.min(wei, MAX_VALUE_WEI);
        //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        //#endif

        await crowdsale.sendTransaction({ from: BUYER_3, value: wei });
        await increaseTime(END_TIME - await getBlockchainTimestamp() + 1);
        await crowdsale.finalize({ from: TARGET_USER });

        const balanceBeforeRefund = await web3async(web3.eth, web3.eth.getBalance, BUYER_3);
        const vault = RefundVault.at(await crowdsale.vault());
        const vaultBalance = await web3async(web3.eth, web3.eth.getBalance, vault.address);

        const refund = await crowdsale.claimRefund({ from: BUYER_3 });
        const gasUsed = new BigNumber(refund.receipt.gasUsed).mul(GAS_PRICE);

        const balanceAfterRefund = (await web3async(web3.eth, web3.eth.getBalance, BUYER_3)).add(gasUsed);
        const returnedFunds = balanceAfterRefund.sub(balanceBeforeRefund);

        returnedFunds.should.be.bignumber.equal(vaultBalance);
    });
    //#endif
    //#endif

    //#if defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
    it('#15 check if minimal value not reached', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });
        //#endif

        const belowMin = MIN_VALUE_WEI.div(2).floor();
        await crowdsale.sendTransaction({ from: BUYER_1, value: belowMin }).should.eventually.be.rejected;
    });

    //#if !defined(D_MAX_VALUE_WEI) || ((defined(D_MAX_VALUE_WEI) && (D_HARD_CAP_WEI/D_MAX_VALUE_WEI) < 1000))
    it('#16 check finish crowdsale because less than minvalue remain', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(BUYER_3, { from: TARGET_USER });
        //#endif

        let wei = HARD_CAP_WEI.sub(MIN_VALUE_WEI.div(2).floor());
        //#if defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = MAX_VALUE_WEI;
        for (let i = 0; i < HARD_CAP_WEI.div(wei).floor(); i++) {
            await crowdsale.sendTransaction({ from: BUYER_3, value: wei });
        }

        const remainWeiToHardCap = HARD_CAP_WEI.sub(await crowdsale.weiRaised());
        if (remainWeiToHardCap.comparedTo(0) > 0) {
            if (remainWeiToHardCap.comparedTo(MIN_VALUE_WEI) >= 0) {
                await crowdsale.sendTransaction({ from: BUYER_3, value: remainWeiToHardCap });
            }
        }
        //#else
        await crowdsale.sendTransaction({ from: BUYER_3, value: wei });
        //#endif

        await crowdsale.sendTransaction({ from: BUYER_3, value: MIN_VALUE_WEI }).should.eventually.be.rejected;
        await crowdsale.finalize({ from: TARGET_USER });
    });
    //#endif
    //#endif

    //#if defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
    it('#17 check if max value exceeded', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - now);

        //#if D_WHITELIST_ENABLED
        await crowdsale.addAddressToWhitelist(BUYER_1, { from: TARGET_USER });
        //#endif

        const aboveMax = MAX_VALUE_WEI.mul(1.5);
        await crowdsale.sendTransaction({ from: BUYER_1, value: aboveMax }).should.eventually.be.rejected;
    });
    //#endif

    //#if D_CAN_CHANGE_END_TIME == true
    it('#18 check set end time', async () => {
        const crowdsale = await createCrowdsale();

        const NEW_END_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        await crowdsale.setEndTime(NEW_END_TIME, { from: TARGET_USER });
        const newEndTime = await crowdsale.endTime();
        Number(newEndTime).should.be.equals(NEW_END_TIME, 'end time was not changed');

        // set end time by other
        await crowdsale.setEndTime(NEW_END_TIME - 1).should.eventually.be.rejected;
        // set end time less then start
        await crowdsale.setEndTime(START_TIME - 1, { from: TARGET_USER }).should.eventually.be.rejected;

        // move till ended
        await increaseTime(NEW_END_TIME - now + 1);
        const hasEnded = await crowdsale.hasEnded();
        hasEnded.should.be.equals(true, 'hasEnded must be true, time shifted to new end time');
    });

    it('#19 check set end time at wrong time', async () => {
        const crowdsale = await createCrowdsale();

        const NEW_END_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        // move till started
        await increaseTime(START_TIME - now + 1);

        await crowdsale.setEndTime(NEW_END_TIME, { from: TARGET_USER });
        const newEndTime = await crowdsale.endTime();
        Number(newEndTime).should.be.equals(NEW_END_TIME, 'end time was not changed');

        // move till ended
        await increaseTime(NEW_END_TIME - START_TIME + 1);

        // impossible to change end time, because already ended
        await crowdsale.setEndTime(NEW_END_TIME + 2).should.eventually.be.rejected;
    });

    it('#20 check set wrong end time', async () => {
        const crowdsale = await createCrowdsale();

        const MIDDLE_TIME = START_TIME + (END_TIME - START_TIME) / 2;

        // move till new end time will be in the past
        await timeTo(MIDDLE_TIME);

        // end time in the past
        await crowdsale.setEndTime(MIDDLE_TIME).should.eventually.be.rejected;
    });
    //#endif

    //#if D_CAN_CHANGE_START_TIME == true
    it('#21 check set start time', async () => {
        const crowdsale = await createCrowdsale();
        const NEW_START_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        await crowdsale.setStartTime(NEW_START_TIME, { from: TARGET_USER });
        const newStartTime = await crowdsale.startTime();
        Number(newStartTime).should.be.equals(NEW_START_TIME, 'start time was not changed');

        // set start time by other
        await crowdsale.setStartTime(NEW_START_TIME + 1).should.eventually.be.rejected;
        // set start time grate then end
        await crowdsale.setStartTime(END_TIME + 1, { from: TARGET_USER }).should.eventually.be.rejected;

        // move when already started
        await increaseTime(NEW_START_TIME - now + 1);
        const hasStarted = await crowdsale.hasStarted();
        hasStarted.should.be.equals(true, 'hasStarted must be true, time shifted to new start time');
    });

    it('#22 check set start time at wrong time', async () => {
        const crowdsale = await createCrowdsale();

        // move till started
        await timeTo(START_TIME + 1);

        const NEW_START_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        await crowdsale.setStartTime(NEW_START_TIME, { from: TARGET_USER }).should.eventually.be.rejected;

        // move till ended
        await timeTo(END_TIME + 1);

        // impossible to change start time, because already ended
        await crowdsale.setStartTime(END_TIME + 10, { from: TARGET_USER }).should.eventually.be.rejected;
    });

    it('#23 check set wrong start time', async () => {
        const crowdsale = await createCrowdsale();
        // after the end
        const NEW_START_TIME = END_TIME + 1;

        await crowdsale.setStartTime(NEW_START_TIME, { from: TARGET_USER }).should.eventually.be.rejected;
    });
    //#endif

    //#if D_CAN_CHANGE_START_TIME == true && D_CAN_CHANGE_END_TIME == true
    it('#24 check set start time/end time', async () => {
        const crowdsale = await createCrowdsale();
        // after the end
        const MIDDLE_TIME = Math.floor(START_TIME + (END_TIME - START_TIME) / 2);

        await crowdsale.setTimes(MIDDLE_TIME + 1, MIDDLE_TIME - 1, { from: TARGET_USER }).should.eventually.be.rejected;

        await crowdsale.setTimes(START_TIME - 1, END_TIME, { from: TARGET_USER }).should.eventually.be.rejected;

        await crowdsale.setTimes(MIDDLE_TIME - 1, MIDDLE_TIME + 1, { from: TARGET_USER });
        const newStartTime = await crowdsale.startTime();
        Number(newStartTime).should.be.equals(MIDDLE_TIME - 1, 'start time was not changed');

        const newEndTime = await crowdsale.endTime();
        Number(newEndTime).should.be.equals(MIDDLE_TIME + 1, 'end time was not changed');

        await timeTo(MIDDLE_TIME - 10);
        await crowdsale.setTimes(MIDDLE_TIME, MIDDLE_TIME + 20, { from: TARGET_USER });

        await timeTo(MIDDLE_TIME + 10);
        // already started
        await crowdsale.setTimes(MIDDLE_TIME + 1, END_TIME, { from: TARGET_USER }).should.eventually.be.rejected;
        // end time in the past
        await crowdsale.setTimes(MIDDLE_TIME, MIDDLE_TIME + 5, { from: TARGET_USER }).should.eventually.be.rejected;

        await crowdsale.setTimes(MIDDLE_TIME, MIDDLE_TIME + 30, { from: TARGET_USER });

        const finalEndTime = await crowdsale.endTime();
        Number(finalEndTime).should.be.equals(MIDDLE_TIME + 30, 'end time was not changed');

        await timeTo(MIDDLE_TIME + 31);
        // already ended
        await crowdsale.setTimes(MIDDLE_TIME, END_TIME, { from: TARGET_USER }).should.eventually.be.rejected;
    });
    //#endif

    //#if D_WHITELIST_ENABLED
    it('#25 check buy not by whitelisted', async () => {
        const crowdsale = await createCrowdsale();
        await timeTo(START_TIME);

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif

        //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(BigNumber.min(wei, MAX_VALUE_WEI), MIN_VALUE_WEI);
        //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = BigNumber.min(wei, MAX_VALUE_WEI);
        //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        //#endif

        await crowdsale.sendTransaction({ from: BUYER_1, value: wei }).should.eventually.be.rejected;
    });

    it('#26 check add multiple addresses to whitelist', async () => {
        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif

        //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(BigNumber.min(wei, MAX_VALUE_WEI), MIN_VALUE_WEI);
        //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = BigNumber.min(wei, MAX_VALUE_WEI);
        //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        //#endif

        const addresses = [BUYER_1, BUYER_2];

        for (let i = 0; i < addresses.length; i++) {
            await revert(snapshotId);
            snapshotId = (await snapshot()).result;

            const crowdsale = await createCrowdsale();
            await timeTo(START_TIME);

            await crowdsale.addAddressesToWhitelist(addresses, { from: TARGET_USER });
            await crowdsale.sendTransaction({ from: addresses[i], value: wei });
        }
    });

    it('#27 check remove addresses from whitelist', async () => {
        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif

        //#if defined(D_MAX_VALUE_WEI) && defined(D_MIN_VALUE_WEI) && D_MAX_VALUE_WEI != 0 && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(BigNumber.min(wei, MAX_VALUE_WEI), MIN_VALUE_WEI);
        //#elif defined(D_MAX_VALUE_WEI) && D_MAX_VALUE_WEI != 0
        wei = BigNumber.min(wei, MAX_VALUE_WEI);
        //#elif defined(D_MIN_VALUE_WEI) && D_MIN_VALUE_WEI != 0
        wei = BigNumber.max(wei, MIN_VALUE_WEI);
        //#endif

        const addresses = [BUYER_1, BUYER_2, BUYER_3];

        const crowdsale = await createCrowdsale();
        await timeTo(START_TIME);

        await crowdsale.addAddressesToWhitelist(addresses, { from: TARGET_USER });

        await crowdsale.removeAddressFromWhitelist(BUYER_1, { from: TARGET_USER });
        await crowdsale.sendTransaction({ from: BUYER_1, value: wei }).should.eventually.be.rejected;

        await crowdsale.removeAddressesFromWhitelist([BUYER_2, BUYER_3], { from: TARGET_USER });
        await crowdsale.sendTransaction({ from: BUYER_2, value: wei }).should.eventually.be.rejected;
        await crowdsale.sendTransaction({ from: BUYER_3, value: wei }).should.eventually.be.rejected;
    });

    it('#28 check whitelist 100 addresses', async () => {
        const addresses = new Array(100).fill(accounts[0]);
        const crowdsale = await createCrowdsale();
        const tx = await crowdsale.addAddressesToWhitelist(addresses, { from: TARGET_USER });
        console.info('Gas used for whitelist 100 addresses: ', tx.receipt.gasUsed);
    });
    //#endif
});
