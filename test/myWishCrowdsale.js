const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const BigNumber = require("bignumber.js");
const {increaseTime, revert, snapshot, mineBlock} = require('./evmMethods');
const utils = require('./web3Utils');

const Crowdsale = artifacts.require("./MyWishCrowdsale.sol");
// const Token = artifacts.require("./MyWishToken.sol");
// const BonusProvider = artifacts.require("./MyWishBonusProvider.sol");

// const PRE_SOLD_TOKENS = 8200000;
const SOFT_CAP_TOKENS = 1000000;
const HARD_CAP_TOKENS = 22000000;
const COLD_WALLET = '0x123';
const DAY = 24 * 3600;

let NOW, YESTERDAY, DAY_BEFORE_YESTERDAY, TOMORROW, DAY_AFTER_TOMORROW;

const initTime = (now) => {
    NOW = now;
    YESTERDAY = now - DAY;
    DAY_BEFORE_YESTERDAY = YESTERDAY - DAY;
    TOMORROW = now + DAY;
    DAY_AFTER_TOMORROW = TOMORROW + DAY;
};

initTime(Math.ceil(new Date("2017-10-10T15:00:00Z").getTime() / 1000));

contract('Crowdsale', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const BUYER_2 = accounts[2];
    const RICH_MAN = accounts[3];
    const RATE = 240;

    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        console.info("Snapshot is", snapshotId);
        await mineBlock();
        const block = await utils.web3async(web3.eth, web3.eth.getBlock, 'latest');
        const blockTime = block.timestamp;
        console.info("Move time to ", blockTime);
        initTime(blockTime);
    });

    afterEach(async () => {
        console.info("Reverting...");
        await revert(snapshotId);
        console.info("Reverted to ", snapshotId);
    });

    it('#0', () => {
        accounts.forEach((account, index) => {
            web3.eth.getBalance(account, (_, balance) => {
                const etherBalance = web3.fromWei(balance, "ether");
                console.info(`Account ${index} (${account}) balance is ${etherBalance}`)
            });
        });
    });

    it('#1 construct', async () => {
        const crowdsale = await Crowdsale.deployed();
        (await crowdsale.token()).should.have.length(42);
    });

    it('#2 check started', async () => {
        const crowdsale = await Crowdsale.new(NOW + 10, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
        await increaseTime(20);
        (await crowdsale.hasStarted()).should.be.equals(true);
    });

    it('#3 check not yet started', async () => {
        const crowdsale = await Crowdsale.new(TOMORROW, DAY_AFTER_TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
        (await crowdsale.hasStarted()).should.be.equals(false);
    });

    it('#4 check already finished', async () => {
        const crowdsale = await Crowdsale.new(NOW + 10, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
        await increaseTime(2 * DAY);
        (await crowdsale.hasStarted()).should.be.equals(true);
        (await crowdsale.hasEnded()).should.be.equals(true);
    });

    it('#5 check simple buy token', async () => {
        const crowdsale = await Crowdsale.new(NOW + 10, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);

        await increaseTime(DAY / 2);
        const ETH = web3.toWei(1, 'ether');
        const TOKENS = ETH * RATE;
        console.log("send");
        await crowdsale.sendTransaction({from: BUYER_1, value: ETH});
        console.log("done");
        const token = Token.at(await crowdsale.token());
        (await token.balanceOf(BUYER_1)).toNumber().should.be.equals(TOKENS);
        (await new Promise(function (resolve, reject) {
            web3.eth.getBalance(COLD_WALLET, function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            })
        })).toNumber().should.be.equals(Number(ETH), 'money should be on cold wallet');
    });
});