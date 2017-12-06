const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const BigNumber = require("bignumber.js");
const {increaseTime, revert, snapshot} = require('./evmMethods');

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
        const crowdsale = await Crowdsale.new(NOW, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
        (await crowdsale.hasStarted()).should.be.equals(true);
    });

    it('#3 check not yet started', async () => {
        const crowdsale = await Crowdsale.new(TOMORROW, DAY_AFTER_TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
        (await crowdsale.hasStarted()).should.be.equals(false);
    });

    it('#4 check already finished', async () => {
        const crowdsale = await Crowdsale.new(NOW, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
        await increaseTime(2 * DAY);
        (await crowdsale.hasStarted()).should.be.equals(true);
        (await crowdsale.hasEnded()).should.be.equals(true);
    });

    // it('#5 check simple buy token', async () => {
    //     const crowdsale = await Crowdsale.new(NOW, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
    //     await increaseTime(2 * DAY);
    //     const ETH = web3.toWei(1, 'ether');
    //     const TOKENS = ETH * RATE;
    //     await web3.eth.sendTransaction({from: BUYER_1, value: ETH, to: crowdsale.address});
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

    // it('#6 check buy bonuses', async () => {
    //     const ethBonus = [
    //         web3.toWei(10, 'ether'),
    //         web3.toWei(30, 'ether'),
    //         web3.toWei(50, 'ether'),
    //         web3.toWei(100, 'ether'),
    //         web3.toWei(500, 'ether'),
    //         web3.toWei(1000, 'ether'),
    //     ];
    //
    //     const tokenBonus = [
    //         web3.toWei(15375, 'ether'),
    //         web3.toWei(46800, 'ether'),
    //         web3.toWei(78750, 'ether'),
    //         web3.toWei(160500, 'ether'),
    //         web3.toWei(825000, 'ether'),
    //         web3.toWei(1695000, 'ether'),
    //     ];
    //
    //     const stages = [
    //         web3.toWei(1650, 'ether'),
    //         web3.toWei(1780, 'ether'),
    //         web3.toWei(1950, 'ether'),
    //     ];
    //
    //     const amountsPerStage = [
    //         web3.toWei(3635775, 'ether'),
    //         web3.toWei(3635775 + 3620520, 'ether'),
    //         web3.toWei(3635775 + 3620520 + 3635775, 'ether'),
    //     ];
    //
    //     const crowdsale = await Crowdsale.new(YESTERDAY, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
    //     const token = Token.at(await crowdsale.token());
    //
    //
    //     // gos through rates: 1950, 1800 and 1650
    //     for (let i = 0; i < stages.length; i++) {
    //         const eth = stages[i];
    //         const tokens = amountsPerStage[i];
    //         await crowdsale.sendTransaction({from: REACH_MAN, value: eth});
    //         (await crowdsale.soldTokens()).toNumber().should.be.equals(Number(tokens), 'soldTokens must be');
    //         (await token.balanceOf(REACH_MAN)).toNumber().should.be.equals(Number(tokens), 'balanceOf buyer must be');
    //     }
    //
    //     // now rate is 1500
    //     for (let i = 0; i < ethBonus.length; i++) {
    //         const eth = ethBonus[i];
    //         const tokens = tokenBonus[i];
    //         // buy tokens
    //         await crowdsale.sendTransaction({from: BUYER_2, value: eth});
    //         // check balance
    //         (await token.balanceOf(BUYER_2)).toNumber().should.be.equals(Number(tokens), 'balanceOf buyer must be');
    //         // burn tokens
    //         await token.burn(Number(tokens), {from: BUYER_2});
    //     }
    // });
    //
    // it('#7 check hard cap', async () => {
    //     const hardCap = PRE_SOLD_TOKENS + 1000000;
    //     const crowdsale = await Crowdsale.new(YESTERDAY, TOMORROW, SOFT_CAP_TOKENS, hardCap);
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
    //
    // it('#8 check finish crowdsale after time', async () => {
    //     const crowdsale = await Crowdsale.new(YESTERDAY, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
    //     const token = Token.at(await crowdsale.token());
    //     // send some tokens
    //     await crowdsale.send(web3.toWei(1, 'ether'));
    //     try {
    //         // try to finalize before the END
    //         await crowdsale.finalize();
    //     }
    //     catch (error) {
    //         error.message.search('invalid opcode').should.be.greaterThan(0, 'error should be "invalid opcode"');
    //         // there is not way to reset and decrease time
    //         await increaseTime(DAY + 120);
    //         // finalize after the END time
    //         await crowdsale.finalize();
    //         // try to transfer some tokens (it should work now)
    //         const tokens = web3.toWei(100, 'ether');
    //         await token.transfer(BUYER_1, tokens);
    //         (await token.balanceOf(BUYER_1)).toNumber().should.be.equals(Number(tokens), 'balanceOf buyer must be');
    //         (await token.owner()).should.be.equals(OWNER, 'token owner must be OWNER, not crowdsale');
    //         return;
    //     }
    //     assert.fail(true, false, 'Finalize should not work before ended.');
    // });
    //
    // it('#9 check that tokens are locked', async () => {
    //     const crowdsale = await Crowdsale.new(YESTERDAY, TOMORROW, HARD_CAP_TOKENS);
    //     const token = Token.at(await crowdsale.token());
    //
    //     await crowdsale.send(web3.toWei(1, 'ether'));
    //
    //     try {
    //         await token.transfer(BUYER_1, web3.toWei(100, 'ether'));
    //     }
    //     catch (error) {
    //         error.message.search('invalid opcode').should.be.greaterThan(0, 'error should be "invalid opcode"');
    //         return;
    //     }
    //     assert.fail(true, false, 'Token transfer must be locked.');
    // });
    //
    // it('#10 check finish crowdsale because hardcap', async () => {
    //     const hardCap = PRE_SOLD_TOKENS + 1000000;
    //     const crowdsale = await Crowdsale.new(YESTERDAY, TOMORROW, SOFT_CAP_TOKENS, hardCap);
    //     const token = Token.at(await crowdsale.token());
    //
    //     // reach hard cap
    //     const eth = web3.toWei(500, 'ether');
    //     await crowdsale.sendTransaction({from: REACH_MAN, value: eth});
    //
    //     // finalize
    //     await crowdsale.finalize();
    //     (await token.owner()).should.be.equals(OWNER, 'token owner must be OWNER, not crowdsale');
    // });
    //
    // it('#11 check that excluded can transfer', async () => {
    //     const crowdsale = await Crowdsale.new(YESTERDAY, TOMORROW, SOFT_CAP_TOKENS, HARD_CAP_TOKENS);
    //     const token = Token.at(await crowdsale.token());
    //
    //     // buy some
    //     await crowdsale.send(web3.toWei(1, 'ether'));
    //     // exclude owner
    //     await crowdsale.addExcluded(OWNER);
    //
    //     const tokens = web3.toWei(100, 'ether');
    //     // try to transfer
    //     await token.transfer(BUYER_1, tokens);
    //     // check balance
    //     (await token.balanceOf(BUYER_1)).toNumber().should.be.equals(Number(tokens), 'balanceOf buyer must be');
    // })
});