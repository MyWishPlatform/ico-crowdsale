const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const { revert, snapshot } = require('sc-library/test-utils/evmMethods');
const { estimateConstructGas } = require('sc-library/test-utils/web3Utils');

const Token = artifacts.require('./MainToken.sol');
//#if !defined(D_ONLY_TOKEN) || !D_ONLY_TOKEN
const Crowdsale = artifacts.require('./TemplateCrowdsale.sol');
//#endif
const SuccessfulERC223Receiver = artifacts.require('./SuccessfulERC223Receiver.sol');
const FailingERC223Receiver = artifacts.require('./FailingERC223Receiver.sol');
const ERC223ReceiverWithoutTokenFallback = artifacts.require('./ERC223ReceiverWithoutTokenFallback.sol');

//#if D_PREMINT_COUNT > 0
const extractBigNumber = (string) => new BigNumber(string.match(/\((\d+)\)/)[1]);

const premintAddresses = 'D_PREMINT_ADDRESSES'.split(',')
    .map(s => s.match(/\((\w+)\)/)[1]);

const premintAmounts = 'D_PREMINT_AMOUNTS'.split(',')
    .map(s => extractBigNumber(s));
//#endif

contract('Token', accounts => {
    const OWNER = accounts[0];
    const BUYER_1 = accounts[1];
    const TARGET_USER = accounts[5];

    let TOKEN_OWNER = OWNER;
    //#if defined(D_ONLY_TOKEN) && D_ONLY_TOKEN
    TOKEN_OWNER = TARGET_USER;
    //#endif

    let snapshotId;

    beforeEach(async () => {
        snapshotId = (await snapshot()).result;
    });

    afterEach(async () => {
        await revert(snapshotId);
    });

    it('#0 gas usage', async () => {
        await estimateConstructGas(Token).then(console.info);
    });

    it('#0 3/4 precheck', async () => {
        TARGET_USER.should.be.equals('D_CONTRACTS_OWNER', 'it must be the same');
    });

    it('#1 construct', async () => {
        const token = await Token.new();
        token.address.should.have.length(42);
        await token.owner().should.eventually.be.equals(TOKEN_OWNER);
    });

    //#if !D_CONTINUE_MINTING && defined(D_ONLY_TOKEN) && D_ONLY_TOKEN
    it('#2 cannot mint if CONTINUE_MINTING is false', async () => {
        const token = await Token.new();

        const tokensToMint = web3.toWei(1, 'ether');
        await token.mint(BUYER_1, tokensToMint, { from: TOKEN_OWNER }).should.eventually.be.rejected;
    });
    //#else
    it('#2 minting', async () => {
        const token = await Token.new();

        const tokensToMint = web3.toWei(1, 'ether');
        await token.mint(BUYER_1, tokensToMint, { from: TOKEN_OWNER });
        const balance = await token.balanceOf(BUYER_1);
        balance.should.bignumber.be.equals(tokensToMint);
    });

    it('#3 minting after it finished', async () => {
        const token = await Token.new();

        const tokensToMint = web3.toWei(1, 'ether');

        await token.finishMinting({ from: TOKEN_OWNER });
        await token.mint(BUYER_1, tokensToMint, { from: TOKEN_OWNER }).should.eventually.be.rejected;
    });

    it('#4 burn', async () => {
        const token = await Token.new();

        const tokensToMint = web3.toWei(1, 'ether');
        await token.mint(OWNER, tokensToMint, { from: TOKEN_OWNER });
        await token.burn(tokensToMint + 1).should.eventually.be.rejected;
        await token.burn(tokensToMint / 2);
    });

    //#if "D_ERC" == 23
    it('#5 erc223 transfer to contract', async () => {
        const token = await Token.new();
        const receiver = await SuccessfulERC223Receiver.new();

        const tokensToTransfer = web3.toWei(1, 'ether');
        await token.mint(BUYER_1, tokensToTransfer, { from: TOKEN_OWNER });

        await token.transfer(receiver.address, tokensToTransfer, { from: BUYER_1 });

        const balance = await token.balanceOf(receiver.address);
        balance.should.bignumber.be.equals(tokensToTransfer);
    });

    it('#6 erc223 transfer should fail on contract receiver with failing tokenFallback function', async () => {
        const token = await Token.new();
        const failingReceiver = await FailingERC223Receiver.new();

        const tokensToTransfer = web3.toWei(1, 'wei');
        await token.mint(BUYER_1, tokensToTransfer, { from: TOKEN_OWNER });

        await token.transfer(failingReceiver.address, tokensToTransfer, { from: BUYER_1 })
            .should.eventually.be.rejected;

        await token.balanceOf(failingReceiver.address).should.eventually.be.zero;
    });

    it('#7 erc223 transfer should fail on contract without tokenFallback function', async () => {
        const token = await Token.new();
        const failingReceiver = await ERC223ReceiverWithoutTokenFallback.new();

        const tokensToTransfer = web3.toWei(1, 'wei');
        await token.mint(BUYER_1, tokensToTransfer, { from: TOKEN_OWNER });

        await token.transfer(failingReceiver.address, tokensToTransfer, { from: BUYER_1 })
            .should.eventually.be.rejected;

        await token.balanceOf(failingReceiver.address).should.eventually.be.zero;
    });
    //#endif
    //#endif

    //#if D_PREMINT_COUNT > 0
    it('#8 check initial freezes', async () => {
        const token = await Token.new();
        //#if !defined(D_ONLY_TOKEN) || !D_ONLY_TOKEN
        const crowdsale = await Crowdsale.new(token.address);
        await token.transferOwnership(crowdsale.address);
        await crowdsale.init();
        //#endif

        const map = {};
        for (let i = 0; i < premintAddresses.length; i++) {
            map[premintAddresses[i]] = typeof map[premintAddresses[i]] === 'undefined'
                ? premintAmounts[i]
                : map[premintAddresses[i]].add(premintAmounts[i]);
        }

        await Promise.all(Object.keys(map).map(async (key) => {
            (await token.balanceOf(key)).should.bignumber.be.equals(map[key]);
        }));
    });
    //#endif
});
