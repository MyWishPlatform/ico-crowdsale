const MyWillCrowdsale = artifacts.require("./MyWillCrowdsale.sol");

module.exports = function(deployer) {
    deployer.deploy(MyWillCrowdsale, new Date("2017-10-25T9:00:00Z+0300").getTime() / 1000, new Date("2017-11-26T11:00:00Z+0300").getTime() / 1000, 22000000);
};