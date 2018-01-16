const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const {increaseTime, revert, snapshot, mine} = require('./evmMethods');
const {web3async} = require('./web3Utils');

const Crowdsale = artifacts.require("./TemplateCrowdsale.sol");
const Token = artifacts.require("./MainToken.sol");
const RefundVault = artifacts.require("./RefundVault.sol");
const BASE_RATE = D_RATE;
const SOFT_CAP_WEI = D_SOFT_CAP_WEI;
const HARD_CAP_WEI = D_HARD_CAP_WEI;
const COLD_WALLET = "D_COLD_WALLET";
const START_TIME = D_START_TIME;
const END_TIME = D_END_TIME;

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
String.prototype.toWeiNumber = function () {
    const match = this.match(/\((\d+)( (\w+))?\)/);
    return match[3] ? Number(web3.toWei(match[1], match[3])) : Number(match[1]);
};

//#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
const weiRaisedBoundaries = 'D_WEI_RAISED_BOUNDARIES'.split(',')
    .map(s => s.toWeiNumber());

const timeBoundaries = 'D_TIME_BOUNDARIES'.split(',')
    .map(w => w.toWeiNumber());

const weiRaisedAndTimeRates = "D_WEI_RAISED_AND_TIME_MILLIRATES".split(',')
    .map(w => w.toWeiNumber());
//#endif

//#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
const weiAmountBoundaries = 'D_WEI_AMOUNT_BOUNDARIES'.split(',')
    .map(s => s.toWeiNumber());

const weiAmountRates = "D_WEI_AMOUNT_MILLIRATES".split(',')
    .map(w => w.toWeiNumber());
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
        const now = await getBlockchainTimestamp();
        const weiRaised = (await crowdsale.weiRaised()).toNumber();

        //#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
        for (let i = 0; i < weiRaisedBoundaries.length; i++) {
            if (weiRaised <= weiRaisedBoundaries[i] && now <= timeBoundaries[i]) {
                rate += Math.floor(BASE_RATE * weiRaisedAndTimeRates[i] / 1000);
                break;
            }
        }
        //#endif

        //#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
        for (let i = 0; i < weiAmountBoundaries.length; i++) {
            if (weiAmount >= weiAmountBoundaries[i]) {
                rate += Math.floor(rate * weiAmountRates[i] / 1000);
                break;
            }
        }
        //#endif
        //#endif
        return rate;
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

        await increaseTime(START_TIME - NOW + 10);
        hasStarted = await crowdsale.hasStarted();
        hasStarted.should.be.equals(true, "crowdsale should be started after timeshift.");
    });

    it('#3 check finished', async () => {
        const crowdsale = await createCrowdsale();
        let hasStarted = await crowdsale.hasStarted();
        let hasEnded = await crowdsale.hasEnded();

        hasStarted.should.be.equals(false, "hasStarted before timeshift");
        hasEnded.should.be.equals(false, "hasEnded before timeshift");

        await increaseTime(END_TIME - NOW + 10);

        hasStarted = await crowdsale.hasStarted();
        hasEnded = await crowdsale.hasEnded();

        hasStarted.should.be.equals(true, "hasStarted after timeshift");
        hasEnded.should.be.equals(true, "hasEnded after timeshift");
    });

    it('#4 check simple buy token', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - NOW + 10);

        let eth = SOFT_CAP_WEI / 2;
        //#if D_SOFT_CAP_WEI == 0
        eth = web3.toWei(1, 'ether');
        //#endif
        const tokens = eth * await getRate(eth, crowdsale);

        const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
        await crowdsale.sendTransaction({from: BUYER_1, value: eth});
        const token = Token.at(await crowdsale.token());
        (await token.balanceOf(BUYER_1)).toString().should.be.equals(tokens.toString());

        let balance;
        //#if D_SOFT_CAP_WEI == 0
        balance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET) - coldWalletSourceBalance;
        //#else
        const vault = RefundVault.at(await crowdsale.vault());
        balance = await web3async(web3.eth, web3.eth.getBalance, vault.address);
        //#endif
        balance.toString().should.be.equals(eth.toString(), 'money should be on vault');
    });

    it('#5 check hard cap', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - NOW);

        await crowdsale.sendTransaction({from: RICH_MAN, value: HARD_CAP_WEI});

        const moreOne = web3.toWei(1, 'ether');
        await crowdsale.sendTransaction({from: BUYER_1, value: moreOne}).should.eventually.be.rejected;
    });

    it('#6 check finish crowdsale after time', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - NOW);

        let eth = SOFT_CAP_WEI / 2;
        //#if D_SOFT_CAP_WEI == 0
        eth = web3.toWei(1, 'ether');
        //#endif
        // send some tokens
        await crowdsale.send(eth);

        // try to finalize before the END
        await crowdsale.finalize({from: TARGET_USER}).should.eventually.be.rejected;

        await increaseTime(END_TIME - START_TIME + 1);
        // finalize after the END time
        await crowdsale.finalize({from: TARGET_USER});
        // try to transfer some tokens (it should work now)
        const tokens = web3.toWei(100, 'ether');
        await token.transfer(BUYER_1, tokens);
        (await token.balanceOf(BUYER_1)).toString().should.be.equals(tokens.toString(), 'balanceOf buyer must be');
        (await token.owner()).should.be.equals(TARGET_USER, 'token owner must be TARGET_USER, not crowdsale');
    });

    it('#7 check tokens locking', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - NOW);

        let eth = SOFT_CAP_WEI / 2;
        //#if D_SOFT_CAP_WEI == 0
        eth = web3.toWei(1, 'ether');
        //#endif
        await crowdsale.send(eth);

        //#if D_PAUSE_TOKENS == true
        await token.transfer(BUYER_1, web3.toWei(100, 'ether')).should.eventually.be.rejected;
        //#else
        await token.transfer(BUYER_1, web3.toWei(100, 'ether'));
        //#endif
    });

    it('#8 check finish crowdsale because hardcap', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - NOW);

        // reach hard cap
        await crowdsale.sendTransaction({from: RICH_MAN, value: HARD_CAP_WEI});

        // finalize
        await crowdsale.finalize({from: TARGET_USER});
        (await token.owner()).should.be.equals(TARGET_USER, 'token owner must be TARGET_USER, not crowdsale');
    });

    //#if D_BONUS_TOKENS == true
    it('#9 check buy tokens with bonuses', async () => {
        const checkBuyTokensWithTimeIncreasing = async (buyer, weiAmount, atTime) => {
            await revert(snapshotId);
            snapshotId = (await snapshot()).result;

            const crowdsale = await createCrowdsale();
            if (atTime) {
                await increaseTime(atTime - await getBlockchainTimestamp());
            }

            const bonusedRate = await getRate(weiAmount, crowdsale);
            const expectedTokens = weiAmount * bonusedRate;
            const coldWalletSourceBalance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
            await crowdsale.sendTransaction({from: buyer, value: weiAmount});

            const token = Token.at(await crowdsale.token());
            (await token.balanceOf(buyer)).toString().should.be.equals(expectedTokens.toString());

            let balance;
            //#if D_SOFT_CAP_WEI == 0
            balance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET) - coldWalletSourceBalance;
            //#else
            const vault = RefundVault.at(await crowdsale.vault());
            balance = await web3async(web3.eth, web3.eth.getBalance, vault.address);
            //#endif

            balance.toString().should.be.equals(weiAmount.toString(), 'money should be on vault');
        };

        //#if defined(D_WEI_RAISED_AND_TIME_BONUS_COUNT) && D_WEI_RAISED_AND_TIME_BONUS_COUNT > 0
        for (let i = 0; i < timeBoundaries.length; i++) {
            let eth = SOFT_CAP_WEI / 2;
            //#if D_SOFT_CAP_WEI == 0
            eth = web3.toWei(1, 'ether');
            //#endif
            await checkBuyTokensWithTimeIncreasing(BUYER_1, eth, timeBoundaries[i]);
        }
        //#endif

        //#if defined(D_WEI_AMOUNT_BONUS_COUNT) && D_WEI_AMOUNT_BONUS_COUNT > 0
        for (let i = 0; i < weiAmountBoundaries.length; i++) {
            await checkBuyTokensWithTimeIncreasing(RICH_MAN, weiAmountBoundaries[1], START_TIME);
        }
        //#endif
    });
    //#endif

    //#if D_SOFT_CAP_WEI != 0
    it('#10 check refund before time and after it if goal did not reached', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - await getBlockchainTimestamp());
        await crowdsale.claimRefund().should.eventually.be.rejected;

        await increaseTime(END_TIME - await getBlockchainTimestamp() + 1);
        await crowdsale.claimRefund().should.eventually.be.rejected;
    });

    it('#11 check success refund', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - NOW);

        const eth = SOFT_CAP_WEI / 2;
        await crowdsale.sendTransaction({from: RICH_MAN, value: eth});
        await increaseTime(END_TIME - await getBlockchainTimestamp() + 1);
        await crowdsale.finalize({from: TARGET_USER});

        const balanceBeforeRefund = await web3async(web3.eth, web3.eth.getBalance, RICH_MAN);
        const vault = RefundVault.at(await crowdsale.vault());
        const vaultBalance = await web3async(web3.eth, web3.eth.getBalance, vault.address);

        const refund = await crowdsale.claimRefund({from: RICH_MAN});
        const gasUsed = refund.receipt.gasUsed * web3.toWei(100, 'gwei');

        const balanceAfterRefund = (await web3async(web3.eth, web3.eth.getBalance, RICH_MAN)).add(gasUsed);
        const returnedFunds = balanceAfterRefund.sub(balanceBeforeRefund);

        returnedFunds.toString().should.be.equals(vaultBalance.toString());
    });
    //#endif
});
