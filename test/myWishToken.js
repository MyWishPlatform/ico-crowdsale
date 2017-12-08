const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const {increaseTime, revert, snapshot} = require('./evmMethods');
const utils = require('./web3Utils');

const Crowdsale = artifacts.require("./MyWishCrowdsale.sol");
const Token = artifacts.require("./MyWishToken.sol");
const RefundVault = artifacts.require("./RefundVault.sol");

const DAY = 24 * 3600;

let NOW, TOMORROW, DAY_AFTER_TOMORROW;

const initTime = (now) => {
    NOW = now;
    TOMORROW = now + DAY;
    DAY_AFTER_TOMORROW = TOMORROW + DAY;
};

initTime(Math.ceil(new Date("2017-10-10T15:00:00Z").getTime() / 1000));

contract('Crowdsale', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const BUYER_2 = accounts[2];
    const RICH_MAN = accounts[3];

    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        const block = await utils.web3async(web3.eth, web3.eth.getBlock, 'latest');
        const blockTime = block.timestamp;
        initTime(blockTime);
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#1 construct', async () => {
        const token = await Token.deployed();
        token.address.should.have.length(42);
    });

    it('#2 minting', async () => {
        const token = await Token.deployed();

        const tokensToMint = web3.toWei(1, 'ether');
        await token.mint(BUYER_1, tokensToMint);
        const balance = await token.balanceOf(BUYER_1);
        balance.toString().should.be.equals(tokensToMint.toString());
    });

    it('#3 minting after it finished', async () => {
        const token = await Token.deployed();

        const tokensToMint = web3.toWei(1, 'ether');

        await token.finishMinting();
        try {
            await token.mint(BUYER_1, tokensToMint);
        } catch (error) {
            return;
        }
        assert.fail(true, false, 'Transaction must be failed because minting is finished.');
    });

    // it('#3 check not yet started', async () => {
    //     const crowdsale = await Crowdsale.new(TOMORROW, DAY_AFTER_TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
    //     (await crowdsale.hasStarted()).should.be.equals(false);
    // });
    //
    // it('#4 check already finished', async () => {
    //     const crowdsale = await Crowdsale.new(NOW + 30, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
    //     await increaseTime(2 * DAY);
    //     (await crowdsale.hasStarted()).should.be.equals(true);
    //     (await crowdsale.hasEnded()).should.be.equals(true);
    // });

    // it('#5 check simple buy token', async () => {
    //     const crowdsale = await Crowdsale.new(NOW + 30, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
    //     await increaseTime(50);
    //     const ETH = web3.toWei(1, 'ether');
    //     const TOKENS = ETH * RATE;
    //     console.log("START");
    //     await crowdsale.sendTransaction({from: BUYER_1, value: ETH});
    //     console.log("END");
    //     const token = Token.at(await crowdsale.token());
    //     (await token.balanceOf(BUYER_1)).toNumber().should.be.equals(TOKENS);
    //     (await new Promise(function (resolve, reject) {
    //         web3.eth.getBalance(COLD_WALLET, function (error, result) {
    //             if (error) {
    //                 reject(error);
    //             } else {
    //                 resolve(result);
    //             }
    //         })
    //     })).toNumber().should.be.equals(Number(ETH), 'money should be on cold wallet');
    // });

    // it('#7 check hard cap', async() => {
    //     // const hardCap = PRE_SOLD_TOKENS + 1000000;
    //     const crowdsale = await Crowdsale.new(YESTERDAY, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
    //
    //     const eth = web3.toWei(500, 'ether'); // > 1000000/1950;
    //     await crowdsale.sendTransaction({from: REACH_MAN, value: eth});
    //
    //     const moreOne = web3.toWei(1, 'ether');
    //     try {
    //         await crowdsale.sendTransaction({from: BUYER_1, value: moreOne});
    //     }
    //     catch (error) {
    //         error.message.search('invalid opcode').should.be.greaterThan(0, 'error should be "invalid opcode"');
    //         // move hard cap forward
    //         await crowdsale.setHardCap(hardCap + 1000000);
    //         // buy one more
    //         await crowdsale.sendTransaction({from: BUYER_1, value: moreOne});
    //         return;
    //     }
    //     assert.fail(true, false, 'Transaction must be failed because of hardcap.');
    // });
});