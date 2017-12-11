const {increaseTime, revert, snapshot} = require('./evmMethods');
const utils = require('./web3Utils');

const Token = artifacts.require("./MainToken.sol");
const Crowdsale = artifacts.require("./TemplateCrowdsale.sol");
// const Crowdsale = artifacts.require("./MainCrowdsale.sol");

const DAY = 24 * 3600;

let NOW, TOMORROW, DAY_AFTER_TOMORROW;

const initTime = (now) => {
    NOW = now;
    TOMORROW = now + DAY;
    DAY_AFTER_TOMORROW = TOMORROW + DAY;
};

initTime(Math.ceil(new Date("2017-10-10T15:00:00Z").getTime() / 1000));

contract('Gas usage', accounts => {
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

    it('#1 Token', async () => {
        await utils.estimateConstructGas(Token)
            .then(console.info);
    });


    it('#2 Crowdsale', async () => {
        await utils.estimateConstructGas(Crowdsale)
            .then(console.info);
    });


});