const Token = artifacts.require("./MainToken.sol");
const Crowdsale = artifacts.require("./TemplateCrowdsale.sol");

module.exports = function(deployer, network, accounts) {
    const startTime = Math.round(new Date("2017-10-10T15:00:00Z").getTime() / 1000) + 5;
    const endTime = startTime + (24 * 60 * 60); // 1 day
    const softCap = 1000000;
    const hardCap = 22000000;
    const rate = 250;
    const coldWallet = accounts[0];

    deployer.deploy(Token)
        .then(function () {
            deployer.deploy(Token.address);
        });

};