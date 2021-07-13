const { expect } = require('chai');
const { BN, expectEvent, expectRevert, makeInterfaceId, time } = require('@openzeppelin/test-helpers');
const { exitCode, hasUncaughtExceptionCaptureCallback } = require('process');
// require('chai')
//     .use(require('chai-as-promised'))
//     .should();

//const { increaseTime, revert, snapshot } = require('sc-library/test-utils/evmMethods');
//const { web3async } = require('sc-library/test-utils/web3Utils');

const Token = artifacts.require('MainToken');
const MINUS_ONE = new BN(-1);
const ZERO = new BN(0);
const ONE = new BN(1);
const TWO = new BN(2);
const THREE = new BN(3);
const FOUR = new BN(4);
const FIVE = new BN(5);
const SIX = new BN(6);
const SEVEN = new BN(7);
const EIGHT = new BN(8);
const NINE = new BN(9);
const TEN = new BN(10);
const TWENTY = new BN(20);
const Web3 = require("web3");
const web3 = new Web3();
const HOUR = new BN(3600);

contract('Freezable Token', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const TARGET_USER = accounts[5];

    let TOKEN_OWNER = OWNER;
    //#if defined(D_ONLY_TOKEN) && D_ONLY_TOKEN
    TOKEN_OWNER = TARGET_USER;
    //#endif

    let snapshotId;

    // beforeEach(async () => {
    //     await time.advanceBlock();
    //     const now = await time.latest();
    // });

    // afterEach(async () => {
    //     await revert(snapshotId);
    // });

    it('#1 construct', async () => {
        const token = await Token.new();
        token.address.should.have.length(42);
    });

    it('#2 mint and freeze', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = new BN(await time.latest());
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR), {from: TOKEN_OWNER} );
        const freezing = await token.getFreezing(BUYER_1, ZERO);
        freezing[0].should.bignumber.be.equals(now.add(HOUR));
        freezing[1].should.bignumber.be.equals(web3.utils.toWei(ONE, 'ether'));
    });

    it('#3 mint, freeze and release', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = new BN(await time.latest());
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR), {from:TOKEN_OWNER});
        await time.increase(time.duration.hours(1));
        await time.increase(time.duration.seconds(1));
        //await increaseTime(HOUR.add(ONE));
        (await token.releaseOnce({ from: BUYER_1 })).toString();
    });

    it('#4 dot not release before date', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = new BN(await time.latest());
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await token.releaseOnce({ from: BUYER_1 }).should.eventually.be.rejected;
    });

    it('#5 mint, freeze and release all', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = await time.latest();
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await time.increase(time.duration.hours(1));
        await time.increase(time.duration.seconds(1));
        await token.releaseAll({ from: BUYER_1 });
    });

    it('#6 multi freeze', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = new BN(await time.latest());
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(TWO)),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(THREE)),{from: TOKEN_OWNER});

        await time.increase(time.duration.hours(3));
        await time.increase(time.duration.seconds(1));
        await token.releaseAll({ from: BUYER_1 });
    });

    it('#7 freeze, release, freeze, releaseAll', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = new BN(await time.latest());
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(TWO)),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(THREE)),{from: TOKEN_OWNER});

        await time.increase(time.duration.hours(3));
        await time.increase(time.duration.seconds(1));
        await token.releaseOnce({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(TWO);

        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(FOUR)),{from: TOKEN_OWNER});

        await time.increase(time.duration.hours(1));
        await time.increase(time.duration.seconds(1));
        await token.releaseAll({ from: BUYER_1 });

        (await token.freezingCount(BUYER_1)).should.bignumber.be.equals(ZERO);
    });

    it('#8 insert, release almost all, insert to begin, releaseOnce', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = new BN(await time.latest());
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(TWO)),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(FOUR)),{from: TOKEN_OWNER});

        await time.increase(time.duration.hours(2));
        await time.increase(time.duration.seconds(1));
        await token.releaseAll({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(ONE);

        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(THREE)),{from: TOKEN_OWNER});

        await time.increase(time.duration.hours(2));
        await time.increase(time.duration.seconds(1));
        await token.releaseOnce({ from: BUYER_1 });

        (await token.freezingCount(BUYER_1)).should.bignumber.equals(ONE);
    });

    it('#9 insert to begin', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = await time.latest();
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(TWO)),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});

        const freezing0 = await token.getFreezing(BUYER_1, ZERO);
        freezing0[0].should.bignumber.equals(now.add(HOUR));
        freezing0[1].should.bignumber.equals(web3.utils.toWei(ONE, 'ether'));

        const freezing1 = await token.getFreezing(BUYER_1, ONE);
        freezing1[0].should.bignumber.equals(now.add(HOUR.mul(TWO)));
        freezing1[1].should.bignumber.equals(web3.utils.toWei(ONE, 'ether'));
    });

    it('#10 insert to begin and to end', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = await time.latest();
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(TWO)),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(THREE)),{from: TOKEN_OWNER});

        (await token.getFreezing(BUYER_1, ZERO))[0].should.bignumber.equals(now.add(HOUR));
        (await token.getFreezing(BUYER_1, ONE))[0].should.bignumber.equals(now.add(HOUR.mul(TWO)));
        (await token.getFreezing(BUYER_1, TWO))[0].should.bignumber.equals(now.add(HOUR.mul(THREE)));
    });

    it('#11 insert to begin after release', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = await time.latest();
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(THREE)),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(FOUR)),{from: TOKEN_OWNER});

        await time.increase(time.duration.hours(1));
        await time.increase(time.duration.seconds(1));

        await token.releaseOnce({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(TWO);

        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(TWO)),{from: TOKEN_OWNER});

        (await token.getFreezing(BUYER_1, ZERO))[0].should.bignumber.equals(now.add(HOUR.mul(TWO)));
        (await token.getFreezing(BUYER_1, ONE))[0].should.bignumber.equals(now.add(HOUR.mul(THREE)));
        (await token.getFreezing(BUYER_1, TWO))[0].should.bignumber.equals(now.add(HOUR.mul(FOUR)));
    });

    it('#12 insert to end after release', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = await time.latest();
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(TWO)),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(THREE)),{from: TOKEN_OWNER});

        await time.increase(time.duration.hours(1));
        await time.increase(time.duration.seconds(1));

        await token.releaseOnce({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(TWO);

        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(FOUR)),{from: TOKEN_OWNER});

        (await token.getFreezing(BUYER_1, ZERO))[0].should.bignumber.equals(now.add(HOUR.mul(TWO)));
        (await token.getFreezing(BUYER_1, ONE))[0].should.bignumber.equals(now.add(HOUR.mul(THREE)));
        (await token.getFreezing(BUYER_1, TWO))[0].should.bignumber.equals(now.add(HOUR.mul(FOUR)));
    });

    it('#13 insert to middle after release', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = await time.latest();
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(TWO)),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(FOUR)),{from: TOKEN_OWNER});

        await time.increase(time.duration.hours(1));
        await time.increase(time.duration.seconds(1));

        await token.releaseOnce({ from: BUYER_1 });
        (await token.freezingCount(BUYER_1)).should.bignumber.equals(TWO);

        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(THREE)),{from: TOKEN_OWNER});

        (await token.getFreezing(BUYER_1, 0))[0].should.bignumber.equals(now.add(HOUR.mul(TWO)));
        (await token.getFreezing(BUYER_1, 1))[0].should.bignumber.equals(now.add(HOUR.mul(THREE)));
        (await token.getFreezing(BUYER_1, 2))[0].should.bignumber.equals(now.add(HOUR.mul(FOUR)));
    });

    it('#14 balanceOf freezed tokens', async () => {
        const token = await Token.new();
        await time.advanceBlock();
        const now = await time.latest();
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(TWO)),{from: TOKEN_OWNER});
        await token.mintAndFreeze(BUYER_1, web3.utils.toWei(ONE, 'ether'), now.add(HOUR.mul(THREE)),{from: TOKEN_OWNER});

        (await token.balanceOf(BUYER_1)).should.bignumber.be.equals(web3.utils.toWei(THREE, 'ether'));

        await token.mint(BUYER_1, web3.utils.toWei(ONE, 'ether'),{from: TOKEN_OWNER});
        (await token.balanceOf(BUYER_1)).should.bignumber.be.equals(web3.utils.toWei(FOUR, 'ether'));

        await time.increase(time.duration.hours(3));
        await time.increase(time.duration.seconds(1));
        await token.releaseAll({ from: BUYER_1 });
        (await token.balanceOf(BUYER_1)).should.bignumber.be.equals(web3.utils.toWei(FOUR, 'ether'));
    });
});
