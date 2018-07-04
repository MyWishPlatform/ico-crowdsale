const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { increaseTime, revert, snapshot } = require('sc-library/test-utils/evmMethods');
const { web3async } = require('sc-library/test-utils/web3Utils');

const Token = artifacts.require('./FreezableMintableToken.sol');

const HOUR = 3600;

contract('Freezable Token', accounts => {
    const BUYER_1 = accounts[1];

    let now;
    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        const block = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        now = block.timestamp;
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#1 construct', async () => {
        const token = await Token.new();
        token.address.should.have.length(42);
    });

    it('#2 mint and freeze', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        const freezing = await token.getFreezing(BUYER_1, 0);
        freezing[0].should.bignumber.be.equals(now + HOUR);
        freezing[1].should.bignumber.be.equals(web3.toWei(1, 'ether'));
    });

    it('#3 mint, freeze and release', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await increaseTime(HOUR + 1);
        await token.releaseOnce({ from: BUYER_1 });
    });

    it('#4 dot not release before date', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await token.releaseOnce({ from: BUYER_1 }).should.eventually.be.rejected;
    });

    it('#5 mint, freeze and release all', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await increaseTime(HOUR + 1);
        await token.releaseAll({ from: BUYER_1 });
    });

    it('#6 multi freeze', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 2);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 3);

        await increaseTime(HOUR * 3 + 1);
        await token.releaseAll({ from: BUYER_1 });
    });

    it('#7 freeze, release, freeze, releaseAll', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 2);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 3);

        await increaseTime(HOUR * 3 + 1);
        await token.releaseOnce({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(2);

        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 4);

        await increaseTime(HOUR);
        await token.releaseAll({ from: BUYER_1 });

        (await token.freezingCount(BUYER_1)).should.bignumber.be.equals(0);
    });

    it('#8 insert, release almost all, insert to begin, releaseOnce', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 2);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 4);

        await increaseTime(HOUR * 2 + 1);
        await token.releaseAll({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(1);

        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 3);

        await increaseTime(2 * HOUR);
        await token.releaseOnce({ from: BUYER_1 });

        (await token.freezingCount(BUYER_1)).should.bignumber.equals(1);
    });

    it('#9 insert to begin', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 2);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);

        const freezing0 = await token.getFreezing(BUYER_1, 0);
        freezing0[0].should.bignumber.equals(now + HOUR);
        freezing0[1].should.bignumber.equals(web3.toWei(1, 'ether'));

        const freezing1 = await token.getFreezing(BUYER_1, 1);
        freezing1[0].should.bignumber.equals(now + HOUR * 2);
        freezing1[1].should.bignumber.equals(web3.toWei(1, 'ether'));
    });

    it('#10 insert to begin and to end', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 2);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 3);

        (await token.getFreezing(BUYER_1, 0))[0].should.bignumber.equals(now + HOUR);
        (await token.getFreezing(BUYER_1, 1))[0].should.bignumber.equals(now + HOUR * 2);
        (await token.getFreezing(BUYER_1, 2))[0].should.bignumber.equals(now + HOUR * 3);
    });

    it('#11 insert to begin after release', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 3);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 4);

        await increaseTime(HOUR + 1);

        await token.releaseOnce({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(2);

        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 2);

        (await token.getFreezing(BUYER_1, 0))[0].should.bignumber.equals(now + HOUR * 2);
        (await token.getFreezing(BUYER_1, 1))[0].should.bignumber.equals(now + HOUR * 3);
        (await token.getFreezing(BUYER_1, 2))[0].should.bignumber.equals(now + HOUR * 4);
    });

    it('#12 insert to end after release', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 2);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 3);

        await increaseTime(HOUR + 1);

        await token.releaseOnce({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(2);

        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 4);

        (await token.getFreezing(BUYER_1, 0))[0].should.bignumber.equals(now + HOUR * 2);
        (await token.getFreezing(BUYER_1, 1))[0].should.bignumber.equals(now + HOUR * 3);
        (await token.getFreezing(BUYER_1, 2))[0].should.bignumber.equals(now + HOUR * 4);
    });

    it('#13 insert to middle after release', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 2);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 4);

        await increaseTime(HOUR + 1);

        await token.releaseOnce({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(2);

        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 3);

        (await token.getFreezing(BUYER_1, 0))[0].should.bignumber.equals(now + HOUR * 2);
        (await token.getFreezing(BUYER_1, 1))[0].should.bignumber.equals(now + HOUR * 3);
        (await token.getFreezing(BUYER_1, 2))[0].should.bignumber.equals(now + HOUR * 4);
    });

    it('#14 balanceOf freezed tokens', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 2);
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), now + HOUR * 3);

        (await token.balanceOf(BUYER_1)).should.bignumber.be.equals(web3.toWei(3, 'ether'));

        await token.mint(BUYER_1, web3.toWei(1, 'ether'));
        (await token.balanceOf(BUYER_1)).should.bignumber.be.equals(web3.toWei(4, 'ether'));

        await increaseTime(HOUR * 3 + 1);
        await token.releaseAll({ from: BUYER_1 });
        (await token.balanceOf(BUYER_1)).should.bignumber.be.equals(web3.toWei(4, 'ether'));
    });
});
