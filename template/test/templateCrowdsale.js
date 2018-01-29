const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.use(require('chai-bignumber')(web3.BigNumber));
chai.should();
const {increaseTime, revert, snapshot, mine} = require('./evmMethods');
const {web3async} = require('./web3Utils');

const Crowdsale = artifacts.require("./TemplateCrowdsale.sol");
const Token = artifacts.require("./MainToken.sol");
const RefundVault = artifacts.require("./RefundVault.sol");

const BASE_RATE = new web3.BigNumber("D_RATE");
const SOFT_CAP_WEI = new web3.BigNumber("D_SOFT_CAP_WEI");
const HARD_CAP_WEI = new web3.BigNumber("D_HARD_CAP_WEI");
const COLD_WALLET = "D_COLD_WALLET";
const START_TIME = D_START_TIME;
const END_TIME = D_END_TIME;
const TOKEN_DECIMAL_MULTIPLIER = new web3.BigNumber(10).toPower(D_DECIMALS);
const ETHER = web3.toWei(1, 'ether');
const GAS_PRICE = web3.toWei(100, 'gwei');

const DAY = 24 * 3600;

let NOW, TOMORROW, DAY_AFTER_TOMORROW;

const initTime = (now) => {
    NOW = now;
    TOMORROW = now + DAY;
    DAY_AFTER_TOMORROW = TOMORROW + DAY;
};

//#if D_BONUS_TOKENS == true

/**
 * Mapping string to number, eg:
 * 'uint(18000000000000000000)' to 18000000000000000000
 * 'uint(7 ether)'              to 7000000000000000000
 * 'uint(4000000000 gwei)'      to 4000000000000000000
 */
String.prototype.extractBigNumber = function () {
    return new web3.BigNumber(this.match(/\((\d+)\)/)[1]);
};

//#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
const weiRaisedStartsBoundaries = 'D_WEI_RAISED_STARTS_BOUNDARIES'.split(',')
    .map(s => s.extractBigNumber());

const weiRaisedEndsBoundaries = 'D_WEI_RAISED_ENDS_BOUNDARIES'.split(',')
    .map(s => s.extractBigNumber());

const timeStartsBoundaries = 'D_TIME_STARTS_BOUNDARIES'.split(',')
    .map(s => s.extractBigNumber());

const timeEndsBoundaries = 'D_TIME_ENDS_BOUNDARIES'.split(',')
    .map(s => s.extractBigNumber());

const weiRaisedAndTimeRates = "D_WEI_RAISED_AND_TIME_MILLIRATES".split(',')
    .map(s => s.extractBigNumber());
//#endif

//#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
const weiAmountBoundaries = 'D_WEI_AMOUNT_BOUNDARIES'.split(',')
    .map(s => s.extractBigNumber());

const weiAmountRates = "D_WEI_AMOUNT_MILLIRATES".split(',')
    .map(s => s.extractBigNumber());
//#endif
//#endif

contract('TemplateCrowdsale', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const BUYER_2 = accounts[2];
    const RICH_MAN = accounts[3];
    const TARGET_USER = accounts[4];

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

    const dumpInfo = async (crowdsale) => {
        console.log("Started: " + await crowdsale.hasStarted());
        console.log("Ended: " + await crowdsale.hasEnded());
        console.log("Finalized: " + await crowdsale.isFinalized());
        console.log("Owner: " + await crowdsale.owner());
    };

    const getRate = async (weiAmount, crowdsale) => {
        let rate = BASE_RATE;

        //#if D_BONUS_TOKENS == true
        const now = new web3.BigNumber(await getBlockchainTimestamp());
        const weiRaised = await crowdsale.weiRaised();

        //#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
        for (let i = 0; i < weiRaisedStartsBoundaries.length; i++) {
            const weiRaisedInBound = weiRaisedStartsBoundaries[i].lte(weiRaised) && weiRaised.lte(weiRaisedEndsBoundaries[i]);
            const timeInBound = timeStartsBoundaries[i].lte(now) && now.lte(timeEndsBoundaries[i]);
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
        return (await getRate(weiAmount, crowdsale)).mul(weiAmount).mul(TOKEN_DECIMAL_MULTIPLIER).div(ETHER).floor();
    };

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        initTime(await getBlockchainTimestamp());
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#0 balances', () => {
        accounts.forEach((account, index) => {
            web3.eth.getBalance(account, function (_, balance) {
                const etherBalance = web3.fromWei(balance, "ether");
                console.info(`Account ${index} (${account}) balance is ${etherBalance}`)
            });
        });
    });

    it('#0 3/4 precheck', async () => {
        TARGET_USER.should.be.equals(COLD_WALLET, "it must be the same");
    });

    it('#1 construct', async () => {
        const crowdsale = await createCrowdsale();
        await crowdsale.token().then(console.info);
        await crowdsale.token().should.eventually.have.length(42);
    });

    it('#2 check started', async () => {
        const crowdsale = await createCrowdsale();
        let hasStarted = await crowdsale.hasStarted();
        hasStarted.should.be.equals(false, "crowdsale should be not started yet.");

        await increaseTime(START_TIME - NOW);
        hasStarted = await crowdsale.hasStarted();
        hasStarted.should.be.equals(true, "crowdsale should be started after timeshift.");
    });

    it('#3 check finished', async () => {
        const crowdsale = await createCrowdsale();
        let hasStarted = await crowdsale.hasStarted();
        let hasEnded = await crowdsale.hasEnded();

        hasStarted.should.be.equals(false, "hasStarted before timeshift");
        hasEnded.should.be.equals(false, "hasEnded before timeshift");

        await increaseTime(END_TIME - NOW);

        hasStarted = await crowdsale.hasStarted();
        hasEnded = await crowdsale.hasEnded();

        hasStarted.should.be.equals(true, "hasStarted after timeshift");
        hasEnded.should.be.equals(true, "hasEnded after timeshift");
    });

    it('#4 check simple buy token', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - NOW);

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif
        const expectedTokens = await tokensForWei(wei, crowdsale);

        const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
        await crowdsale.sendTransaction({from: BUYER_1, value: wei});
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

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif
        await crowdsale.sendTransaction({from: BUYER_1, value: wei}).should.eventually.be.rejected;
    });

    it('#6 check hard cap', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - NOW);

        await crowdsale.sendTransaction({from: RICH_MAN, value: HARD_CAP_WEI});

        const moreOne = web3.toWei(1, 'ether');
        await crowdsale.sendTransaction({from: BUYER_1, value: moreOne}).should.eventually.be.rejected;
    });

    it('#7 check buy more hardCap', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - NOW);

        const eth = HARD_CAP_WEI.add(web3.toWei(1, 'ether'));

        await crowdsale.sendTransaction({from: RICH_MAN, value: eth}).should.eventually.be.rejected;
    });

    it('#8 check finish crowdsale after time', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - NOW);

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif
        // send some tokens
        await crowdsale.send(wei);

        // try to finalize before the END
        await crowdsale.finalize({from: TARGET_USER}).should.eventually.be.rejected;

        await increaseTime(END_TIME - START_TIME + 1);
        // finalize after the END time
        await crowdsale.finalize({from: TARGET_USER});
        // try to transfer some tokens (it should work now)
        const tokens = await tokensForWei(wei, crowdsale);

        //#if D_CONTINUE_MINTING == true
        await token.owner().should.eventually.be.equals(OWNER, 'token owner must be OWNER (server address), not a TARGET_USER');
        await token.mint(BUYER_2, tokens, {from: OWNER});
        await token.balanceOf(BUYER_2).should.eventually.be.bignumber.equals(tokens, 'balanceOf just minted tokens must be');
        //#else
        // mint must be disabled
        await token.owner().should.eventually.be.equals(TARGET_USER);
        await token.mint(BUYER_2, tokens, {from: TARGET_USER}).should.eventually.be.rejected;

        await token.transfer(BUYER_1, tokens);
        await token.balanceOf(BUYER_1).should.eventually.be.bignumber.equals(tokens, 'balanceOf buyer must be');
        await token.owner().should.eventually.be.equals(TARGET_USER, 'token owner must be TARGET_USER, not OWNER');
        //#endif
    });

    it('#9 check tokens locking', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - NOW);

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif
        await crowdsale.send(wei);

        // check transferable before end
        //#if D_PAUSE_TOKENS == true
        await token.transfer(BUYER_1, await tokensForWei(wei, crowdsale)).should.eventually.be.rejected;
        //#else
        await token.transfer(BUYER_1, await tokensForWei(wei, crowdsale));
        //#endif
    });

    it('#10 check finish crowdsale because hardcap', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - NOW);

        // reach hard cap
        await crowdsale.sendTransaction({from: RICH_MAN, value: HARD_CAP_WEI});

        // finalize
        await crowdsale.finalize({from: TARGET_USER});
        //#if D_CONTINUE_MINTING == true
        await token.owner().should.eventually.be.equals(OWNER, 'token owner must be OWNER (server address), not a TARGET_USER');
        //#else
        await token.owner().should.eventually.be.equals(TARGET_USER, 'token owner must be TARGET_USER, not OWNER');
        //#endif
    });

    it('#11 check finish crowdsale because time', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(END_TIME - NOW);

        let wei = SOFT_CAP_WEI.div(2).floor();
        //#if D_SOFT_CAP_WEI == 0
        wei = HARD_CAP_WEI.div(2).floor();
        //#endif
        await crowdsale.send(wei).should.eventually.be.rejected;
    });

    //#if D_BONUS_TOKENS == true
    it('#12 check buy tokens with bonuses', async () => {
        const checkBuyTokensWithTimeIncreasing = async (buyer, weiAmount, atTime) => {
            weiAmount = new web3.BigNumber(weiAmount);
            await revert(snapshotId);
            snapshotId = (await snapshot()).result;

            const crowdsale = await createCrowdsale();
            if (atTime) {
                await increaseTime(atTime - NOW);
            }

            const expectedTokens = await tokensForWei(weiAmount, crowdsale);
            const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
            await crowdsale.sendTransaction({from: buyer, value: weiAmount});

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
            let wei = SOFT_CAP_WEI.div(2).floor();
            //#if D_SOFT_CAP_WEI == 0
            wei = HARD_CAP_WEI.div(2).floor();
            //#endif
            await checkBuyTokensWithTimeIncreasing(BUYER_1, wei, timeStartsBoundaries[i]);
            // await checkBuyTokensWithTimeIncreasing(BUYER_2)
        }
        //#endif

        //#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
        for (let i = 0; i < weiAmountBoundaries.length; i++) {
            await checkBuyTokensWithTimeIncreasing(RICH_MAN, weiAmountBoundaries[i], START_TIME);
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

    it('#14 check success refund', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - NOW);

        const eth = SOFT_CAP_WEI.div(2).floor();
        await crowdsale.sendTransaction({from: RICH_MAN, value: eth});
        await increaseTime(END_TIME - await getBlockchainTimestamp() + 1);
        await crowdsale.finalize({from: TARGET_USER});

        const balanceBeforeRefund = await web3async(web3.eth, web3.eth.getBalance, RICH_MAN);
        const vault = RefundVault.at(await crowdsale.vault());
        const vaultBalance = await web3async(web3.eth, web3.eth.getBalance, vault.address);

        const refund = await crowdsale.claimRefund({from: RICH_MAN});
        const gasUsed = new web3.BigNumber(refund.receipt.gasUsed).mul(GAS_PRICE);

        const balanceAfterRefund = (await web3async(web3.eth, web3.eth.getBalance, RICH_MAN)).add(gasUsed);
        const returnedFunds = balanceAfterRefund.sub(balanceBeforeRefund);

        returnedFunds.should.be.bignumber.equal(vaultBalance);
    });
    //#endif
});
