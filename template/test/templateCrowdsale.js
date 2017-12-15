const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const {increaseTime, revert, snapshot, mine} = require('./evmMethods');
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

// initTime(Math.ceil(new Date("2017-10-10T15:00:00Z").getTime() / 1000));


contract('TemplateCrowdsale', async(accounts) => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const BUYER_2 = accounts[2];
    const RICH_MAN = accounts[3];

    let snapshotId;

    const createCrowdsale = async () => {
        const token = await Token.new();
        const crowdsale = await Crowdsale.new(token.address);
        await token.transferOwnership(crowdsale.address);
        return crowdsale;
    };

    const getBlockchainTime = async () => {
        const latestBlock = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        return new Date(latestBlock.timestamp * 1000);
    };

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        const latestBlock = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        initTime(latestBlock.timestamp);
        console.info("Now is", NOW);
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
        console.log("Started: " + await crowdsale.hasStarted());
        console.log("Ended: " + await crowdsale.hasEnded());
        const ETH = web3.toWei(1, 'ether');
        const TOKENS = ETH * RATE;

        await crowdsale.sendTransaction({from: BUYER_1, value: ETH});
        const token = Token.at(await crowdsale.token());
        (await token.balanceOf(BUYER_1)).toString().should.be.equals(TOKENS.toString());

        const vault = RefundVault.at(await crowdsale.vault());
        const vaultBalance = await web3async(web3.eth, web3.eth.getBalance, vault.address);
        vaultBalance.toString().should.be.equals(ETH.toString(), 'money should be on vault');
    });

    it('#5 check hard cap', async () => {
        const crowdsale = await createCrowdsale();
        await increaseTime(START_TIME - NOW);

        const eth = web3.toWei(HARD_CAP_ETH, "ether");
        await crowdsale.sendTransaction({from: RICH_MAN, value: eth});

        const moreOne = web3.toWei(1, 'ether');
        await crowdsale.sendTransaction({from: BUYER_1, value: moreOne}).should.eventually.be.rejected;
    });

    it('#7 check finish crowdsale after time', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        if (NOW <= START_TIME) {
            await increaseTime(START_TIME - NOW);
        }

        // send some tokens
        await crowdsale.send(web3.toWei(1, 'ether'));

        // try to finalize before the END
        await crowdsale.finalize().should.eventually.be.rejected;

        await increaseTime(END_TIME - START_TIME + 1);
        // finalize after the END time
        await crowdsale.finalize();
        // try to transfer some tokens (it should work now)
        const tokens = web3.toWei(100, 'ether');
        await token.transfer(BUYER_1, tokens);
        (await token.balanceOf(BUYER_1)).toString().should.be.equals(tokens.toString(), 'balanceOf buyer must be');
        (await token.owner()).should.be.equals(OWNER, 'token owner must be OWNER, not crowdsale');
    });

    it('#8 check that tokens are locked', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        if (NOW <= START_TIME) {
            await increaseTime(START_TIME - NOW);
        }

        await crowdsale.send(web3.toWei(1, 'ether'));

        await token.transfer(BUYER_1, web3.toWei(100, 'ether')).should.eventually.be.rejected;
    });

    it('#9 check finish crowdsale because hardcap', async () => {
        const crowdsale = await createCrowdsale();
        const token = Token.at(await crowdsale.token());
        if (NOW <= START_TIME) {
            await increaseTime(START_TIME - NOW);
        }

        // reach hard cap
        const eth = web3.toWei(HARD_CAP_ETH);
        await crowdsale.sendTransaction({from: RICH_MAN, value: eth});

        // finalize
        await crowdsale.finalize();
        (await token.owner()).should.be.equals(OWNER, 'token owner must be OWNER, not crowdsale');
    });
});
