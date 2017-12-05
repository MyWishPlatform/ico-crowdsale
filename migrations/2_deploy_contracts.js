const MyWishCrowdsale = artifacts.require("./MyWishCrowdsale.sol");

module.exports = function(deployer, network, accounts) {
    const startTime = Math.round(new Date("2017-10-10T15:00:00Z").getTime() / 1000) + 5;
        // web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1; // one second in the future
    const endTime = startTime + (24 * 60 * 60); // 1 day
    const softCap = new web3.BigNumber(1000000);
    const hardCap = new web3.BigNumber(22000000);

    deployer.deploy(
        MyWishCrowdsale,
        startTime,
        endTime,
        softCap,
        hardCap
    );
};