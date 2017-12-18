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
const SOFT_CAP_ETH = D_SOFT_CAP_ETH;
const HARD_CAP_ETH = D_HARD_CAP_ETH;
const COLD_WALLET = "D_COLD_WALLET";
const START_TIME = D_START_TIME;
const END_TIME = D_END_TIME;
const BONUSABLE = D_BONUS_TOKENS;

const DAY = 24 * 60;

let NOW, TOMORROW, DAY_AFTER_TOMORROW;

const initTime = (now) => {
    NOW = now;
    TOMORROW = now + DAY;
    DAY_AFTER_TOMORROW = TOMORROW + DAY;
};

//#if D_BONUS_TOKENS == true
const BRACKETS_NUMBER_REX = /\((\d+)\)/;

const weiRaisedBoundaries = 'D_WEI_RAISED_BOUNDARIES'.split(',')
    .map(w => w.match(BRACKETS_NUMBER_REX)[1]);

const timeBoundaries = 'D_TIME_BOUNDARIES'.split(',')
    .map(w => w.match(BRACKETS_NUMBER_REX)[1]);

const weiRaisedAndTimeRates = "D_WEI_RAISED_AND_TIME_RATES".split(',')
    .map(w => w.match(BRACKETS_NUMBER_REX)[1]);

const weiAmountBoundaries = 'D_WEI_AMOUNT_BOUNDARIES'.split(',')
    .map(w1 => w1.match(/\((\d+ \w+)\)/)[1])
    .map(w2 => {
        w2 = w2.split(" ");
        return Number(web3.toWei(w2[0], w2[1]));
    });

const weiAmountRates = "D_WEI_AMOUNT_RATES".split(',')
    .map(w => w.match(BRACKETS_NUMBER_REX)[1]);
//#endif

contract('TemplateCrowdsale', async(accounts) => {
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
        if (!BONUSABLE) return BASE_RATE;

        const now = await getBlockchainTimestamp();
        const weiRaised = (await crowdsale.weiRaised()).toNumber();

        let rate = BASE_RATE;

        for (let i = 0; i < weiRaisedBoundaries.length; i++) {
            if (weiRaised <= weiRaisedBoundaries[i] || now <= timeBoundaries[i]) {
                rate += BASE_RATE * weiRaisedAndTimeRates[i] / 100;
                break;
            }
        }

        for (let i = 0; i < weiAmountBoundaries.length; i++) {
            if (weiAmount >= weiAmountBoundaries[i]) {
                rate += rate * weiAmountRates[i] / 100;
                break;
            }
        }

        return rate;
    };

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        initTime(await getBlockchainTimestamp());
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#0 balances', async () => {
        accounts.forEach(async (account, index) => {
            const balance = await web3async(web3.eth, web3.eth.getBalance, account);
            const etherBalance = web3.fromWei(balance, "ether");
            console.info(`Account ${index} (${account}) balance is ${etherBalance}`)
        });
    });

    it('#0 3/4 precheck', async() => {
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
        const eth = web3.toWei(1, 'ether');
        const tokens = eth * await getRate(eth, crowdsale);

        const coldWalletSourceBalance =  await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
        await crowdsale.sendTransaction({from: BUYER_1, value: eth});
        const token = Token.at(await crowdsale.token());
        (await token.balanceOf(BUYER_1)).toString().should.be.equals(tokens.toString());

        let balance;
        //#if D_SOFT_CAP_ETH == 0
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

        const eth = web3.toWei(HARD_CAP_ETH, "ether");
        await crowdsale.sendTransaction({from: RICH_MAN, value: eth});

        const moreOne = web3.toWei(1, 'ether');
        await crowdsale.sendTransaction({from: BUYER_1, value: moreOne}).should.eventually.be.rejected;
    });

    it('#6 check finish crowdsale after time', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - NOW);

        // send some tokens
        await crowdsale.send(web3.toWei(1, 'ether'));

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

    it('#7 check that tokens are locked', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - NOW);

        await crowdsale.send(web3.toWei(1, 'ether'));

        await token.transfer(BUYER_1, web3.toWei(100, 'ether')).should.eventually.be.rejected;
    });

    it('#8 check finish crowdsale because hardcap', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        await increaseTime(START_TIME - NOW);

        // reach hard cap
        const eth = web3.toWei(HARD_CAP_ETH);
        await crowdsale.sendTransaction({from: RICH_MAN, value: eth});

        // finalize
        await crowdsale.finalize({from: TARGET_USER});
        (await token.owner()).should.be.equals(TARGET_USER, 'token owner must be TARGET_USER, not crowdsale');
    });

    //#if "D_BONUS_TOKENS" == "true"
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
            const coldWalletSourceBalance =  await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET);
            await crowdsale.sendTransaction({from: buyer, value: weiAmount});

            const token = Token.at(await crowdsale.token());
            (await token.balanceOf(buyer)).toString().should.be.equals(expectedTokens.toString());

            let balance;
            //#if D_SOFT_CAP_ETH == 0
            balance = await web3async(web3.eth, web3.eth.getBalance, COLD_WALLET) - coldWalletSourceBalance;
            //#else
            const vault = RefundVault.at(await crowdsale.vault());
            balance = await web3async(web3.eth, web3.eth.getBalance, vault.address);
            //#endif

            balance.toString().should.be.equals(weiAmount.toString(), 'money should be on vault');
        };

        for (let i = 0; i < timeBoundaries.length; i++) {
            await checkBuyTokensWithTimeIncreasing(BUYER_1, web3.toWei(1, 'ether'), timeBoundaries[i]);
        }

        for (let i = 0; i < weiAmountBoundaries.length; i++) {
            await checkBuyTokensWithTimeIncreasing(RICH_MAN, weiAmountBoundaries[1], START_TIME);
        }
    });
    //#endif

    //#if D_SOFT_CAP_ETH != 0
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

        const eth = web3.toWei(SOFT_CAP_ETH / 2,  'ether');
        await crowdsale.sendTransaction({from: RICH_MAN, value: eth});
        await increaseTime(END_TIME - await getBlockchainTimestamp() + 1);
        await crowdsale.finalize({from: TARGET_USER});

        const balanceBeforeRefund = await web3async(web3.eth, web3.eth.getBalance, RICH_MAN);
        const vault = RefundVault.at(await crowdsale.vault());
        const vaultBalance = await web3async(web3.eth, web3.eth.getBalance, vault.address);

        const refund = await crowdsale.claimRefund({from: RICH_MAN});
        const gasUsed = web3.toWei(refund.receipt.gasUsed, 'szabo') / 10;

        const balanceAfterRefund = (await web3async(web3.eth, web3.eth.getBalance, RICH_MAN)).add(gasUsed);
        const returnedFunds = balanceAfterRefund.sub(balanceBeforeRefund);

        returnedFunds.toString().should.be.equals(vaultBalance.toString());
    });
    //#endif
});
