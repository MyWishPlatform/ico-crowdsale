const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const {increaseTime, revert, snapshot} = require('./evmMethods');
const utils = require('./web3Utils');

const Token = artifacts.require("./FreezableMintableToken.sol");

const HOUR = 3600;
const DAY = 24 * HOUR;

let NOW, TOMORROW, DAY_AFTER_TOMORROW;

const initTime = (now) => {
    NOW = now;
    TOMORROW = now + DAY;
    DAY_AFTER_TOMORROW = TOMORROW + DAY;
};

initTime(Math.ceil(new Date("2017-10-10T15:00:00Z").getTime() / 1000));

contract('Token', accounts => {
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
        console.info("move time to", blockTime);
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
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), NOW + HOUR);
        await increaseTime(HOUR);
        await token.releaseOnce({from: BUYER_1});
    });

    it('#3 dot not release before date', async () => {
        const token = await Token.new();
        await token.mintAndFreeze(BUYER_1, web3.toWei(1, 'ether'), NOW + HOUR);
        await increaseTime(HOUR);
        token.releaseOnce({from: BUYER_1}).should.eventually.be.rejected;
    });
});