const Token = artifacts.require("./MainToken.sol");
const Crowdsale = artifacts.require("./TemplateCrowdsale.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Token)
        .then(function () {
            return deployer.deploy(Crowdsale, Token.address);
        });
};