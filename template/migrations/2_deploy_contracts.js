const Token = artifacts.require('./MainToken.sol');
//#if !defined(D_ONLY_TOKEN) || D_ONLY_TOKEN != true
const Crowdsale = artifacts.require('./TemplateCrowdsale.sol');
//#endif

module.exports = function (deployer, network, accounts) {
    deployer.deploy(Token)
    //#if !defined(D_ONLY_TOKEN) || D_ONLY_TOKEN != true
        .then(function () {
            return deployer.deploy(Crowdsale, Token.address);
        });
    //#endif
};
