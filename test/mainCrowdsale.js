const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
const {increaseTime, revert, snapshot} = require('./evmMethods');
const {web3async} = require('./web3Utils');

const Crowdsale = artifacts.require("./MainCrowdsale.sol");
const Token = artifacts.require("./MainToken.sol");
const RefundVault = artifacts.require("./RefundVault.sol");
const RATE = 250;
const SOFT_CAP_TOKENS = 1000000;
const SOFT_CAP_ETH = SOFT_CAP_TOKENS / RATE;
const HARD_CAP_TOKENS = 22000000;
const HARD_CAP_ETH = HARD_CAP_TOKENS / RATE;
const COLD_WALLET = '0x80826b5b717aDd3E840343364EC9d971FBa3955C';

const DAY = 24 * 3600;

let NOW, TOMORROW, DAY_AFTER_TOMORROW;

const initTime = (now) => {
    NOW = now;
    TOMORROW = now + DAY;
    DAY_AFTER_TOMORROW = TOMORROW + DAY;
};

initTime(Math.ceil(new Date("2017-10-10T15:00:00Z").getTime() / 1000));

const createCrowdsaleWithTime = (startTime, endTime) => {
    return Crowdsale.new(
        startTime,
        endTime,
        SOFT_CAP_ETH,
        HARD_CAP_ETH,
        RATE,
        COLD_WALLET
    );
};

contract('Crowdsale', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const BUYER_2 = accounts[2];
    const RICH_MAN = accounts[3];

    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
        const block = await web3async(web3.eth, web3.eth.getBlock, 'latest');
        const blockTime = block.timestamp;
        initTime(blockTime);
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#0 balances', () => {
        accounts.forEach(async (account, index) => {
            const balance = await web3async(web3.eth, web3.eth.getBalance, account);
            const etherBalance = web3.fromWei(balance, "ether");
            console.info(`Account ${index} (${account}) balance is ${etherBalance}`)
        });
    });

    it('#1 construct', async () => {
        const crowdsale = await Crowdsale.deployed();
        (await crowdsale.token()).should.have.length(42);
    });

    it('#2 check started', async () => {
        const crowdsale = await createCrowdsaleWithTime(NOW, TOMORROW);
        (await crowdsale.hasStarted()).should.be.equals(true);
    });

    it('#3 check not yet started', async () => {
        const crowdsale = await createCrowdsaleWithTime(TOMORROW, DAY_AFTER_TOMORROW);
        (await crowdsale.hasStarted()).should.be.equals(false);
    });

    it('#4 check already finished', async () => {
        const crowdsale = await createCrowdsaleWithTime(NOW, TOMORROW);
        await increaseTime(2 * DAY);
        (await crowdsale.hasStarted()).should.be.equals(true);
        (await crowdsale.hasEnded()).should.be.equals(true);
    });

    it('#5 check simple buy token', async () => {
        const crowdsale = await createCrowdsaleWithTime(NOW, TOMORROW);
        await increaseTime(DAY / 2);
        const ETH = web3.toWei(1, 'ether');
        const TOKENS = ETH * RATE;
        await crowdsale.sendTransaction({from: BUYER_1, value: ETH});
        const token = Token.at(await crowdsale.token());
        (await token.balanceOf(BUYER_1)).toString().should.be.equals(TOKENS.toString());

        const vault = RefundVault.at(await crowdsale.vault());
        const vaultBalance = await web3async(web3.eth, web3.eth.getBalance, vault.address);
        vaultBalance.toString().should.be.equals(ETH.toString(), 'money should be on vault');
    });

    it('#6 check hard cap', async () => {
        const crowdsale = await createCrowdsaleWithTime(NOW, TOMORROW);

        const eth = web3.toWei(Math.floor(HARD_CAP_TOKENS / RATE));
        await crowdsale.sendTransaction({from: RICH_MAN, value: eth});

        const moreOne = web3.toWei(1, 'ether');
        await crowdsale.sendTransaction({from: BUYER_1, value: moreOne}).should.eventually.be.rejected;
    });

    it('#7 check finish crowdsale after time', async () => {
        const crowdsale = await createCrowdsaleWithTime(NOW, TOMORROW);
        const token = Token.at(await crowdsale.token());
        // send some tokens
        await crowdsale.send(web3.toWei(1, 'ether'));

        // try to finalize before the END
        await crowdsale.finalize().should.eventually.be.rejected;

        await increaseTime(DAY + 120);
        // finalize after the END time
        await crowdsale.finalize();
        // try to transfer some tokens (it should work now)
        const tokens = web3.toWei(100, 'ether');
        await token.transfer(BUYER_1, tokens);
        (await token.balanceOf(BUYER_1)).toString().should.be.equals(tokens.toString(), 'balanceOf buyer must be');
        (await token.owner()).should.be.equals(OWNER, 'token owner must be OWNER, not crowdsale');
    });

    it('#8 check that tokens are locked', async () => {
        const crowdsale = await createCrowdsaleWithTime(NOW, TOMORROW);
        const token = Token.at(await crowdsale.token());

        await crowdsale.send(web3.toWei(1, 'ether'));

        await token.transfer(BUYER_1, web3.toWei(100, 'ether')).should.eventually.be.rejected;
    });

    it('#9 check finish crowdsale because hardcap', async () => {
        const crowdsale = await createCrowdsaleWithTime(NOW, TOMORROW);
        const token = Token.at(await crowdsale.token());

        // reach hard cap
        const eth = web3.toWei(HARD_CAP_ETH);
        await crowdsale.sendTransaction({from: RICH_MAN, value: eth});

        // finalize
        await crowdsale.finalize();
        (await token.owner()).should.be.equals(OWNER, 'token owner must be OWNER, not crowdsale');
    });

    it('#10 check that excluded can transfer', async () => {
        const crowdsale = await createCrowdsaleWithTime(NOW, TOMORROW);
        const token = Token.at(await crowdsale.token());

        // buy some
        await crowdsale.send(web3.toWei(1, 'ether'));
        // exclude owner
        await crowdsale.addExcluded(OWNER);

        const tokens = web3.toWei(100, 'ether');
        // try to transfer
        await token.transfer(BUYER_1, tokens);
        // check balance
        (await token.balanceOf(BUYER_1)).toString().should.be.equals(tokens.toString(), 'balanceOf buyer must be');
    })
});
