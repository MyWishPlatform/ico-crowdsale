const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const {increaseTime, revert, snapshot} = require('./evmMethods');
const {web3async} = require('./web3Utils');

const Crowdsale = artifacts.require("./TemplateCrowdsale.sol");
const Token = artifacts.require("./MainToken.sol");
const RefundVault = artifacts.require("./RefundVault.sol");
const RATE = D_RATE;
const SOFT_CAP_TOKENS = D_HARD_CAP_ETH * RATE;
const SOFT_CAP_ETH = D_SOFT_CAP_ETH;
const HARD_CAP_TOKENS = D_HARD_CAP_ETH * RATE;
const HARD_CAP_ETH = D_HARD_CAP_ETH;
const COLD_WALLET = D_COLD_WALLET;
const START_TIME = D_START_TIME;
const END_TIME = D_END_TIME;

const DAY = 24 * 60;

let NOW, TOMORROW, DAY_AFTER_TOMORROW;

const initTime = (now) => {
    NOW = now;
    TOMORROW = now + DAY;
    DAY_AFTER_TOMORROW = TOMORROW + DAY;
};

initTime(Math.ceil(new Date("2017-10-10T15:00:00Z").getTime() / 1000));


contract('TemplateCrowdsale', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const BUYER_2 = accounts[2];
    const RICH_MAN = accounts[3];

    let snapshotId;

    const createCrowdsale = async () => {
        const token = await Token.new();
        return await Crowdsale.new(token.address);
    };

    const getBlockchainTime = async () => {
        const latestBlock = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        return new Date(latestBlock.timestamp * 1000);
    };

    before(async () => {
        snapshotId = (await snapshot()).result;
        // const block = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        // const blockTime = block.timestamp;
        // initTime(blockTime);
        // console.info("Before: " + await getBlockchainTime());
        // console.log(snapshotId)
        console.info("Snapshot: " + snapshotId);
    });

    afterEach(async () => {
        // await revert(snapshotId);
        console.info("Move to: " + snapshotId);
        // console.info("After: " + await getBlockchainTime());
    });

    it('#0 balances', () => {
        accounts.forEach(async (account, index) => {
            const balance = await web3async(web3.eth, web3.eth.getBalance, account);
            const etherBalance = web3.fromWei(balance, "ether");
            console.info(`Account ${index} (${account}) balance is ${etherBalance}`)
        });
    });

    it('#1 construct', async () => {
        const balance = await web3async(web3.eth, web3.eth.getBalance, OWNER);
        const etherBalance = web3.fromWei(balance, "ether");
        console.info(`Account (${OWNER}) balance is ${etherBalance}`);
        const token = await Token.new();
         await Crowdsale.new(token.address);
        // const crowdsale = await createCrowdsale();
        // (await crowdsale.token()).should.have.length(42);
    });

    it('#2 check started', async () => {
        const crowdsale = await createCrowdsale();
        let hasStarted = await crowdsale.hasStarted();
        if (NOW >= START_TIME) {
            hasStarted.should.be.equals(true);
        } else {
            hasStarted.should.be.equals(false);

            await increaseTime(START_TIME - NOW);
            hasStarted = await crowdsale.hasStarted();
            hasStarted.should.be.equals(true);
        }
    });

    it('#3 check finished', async () => {
        const crowdsale = await createCrowdsale();
        let hasStarted = await crowdsale.hasStarted();
        let hasEnded = await crowdsale.hasEnded();

        if (NOW <= START_TIME) {
            hasStarted.should.be.equals(false);
            hasEnded.should.be.equals(false);
        }
        else if (START_TIME <= NOW && NOW <= END_TIME) {
            hasStarted.should.be.equals(true);
            hasEnded.should.be.equals(false);
        }
        else if (NOW >= END_TIME) {
            hasStarted.should.be.equals(true);
            hasEnded.should.be.equals(true);
        }
    });
});
