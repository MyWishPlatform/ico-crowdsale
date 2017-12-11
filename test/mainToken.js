const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const {increaseTime, revert, snapshot} = require('./evmMethods');
const utils = require('./web3Utils');

const Token = artifacts.require("./MainToken.sol");
const RefundVault = artifacts.require("./RefundVault.sol");

const DAY = 24 * 3600;

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
        await token.mint(BUYER_1, tokensToMint).should.eventually.be.rejected;
    });

    it('#4 burn', async () => {
        const token = await Token.deployed();

        const tokensToMint = web3.toWei(1, 'ether');
        await token.mint(OWNER, tokensToMint);
        await token.burn(tokensToMint + 1).should.eventually.be.rejected;
        await token.burn(tokensToMint / 2);
    });
});