const BN = require('bn.js');

require('dotenv').config();



module.exports = async function (deployer, network) {
    const Token = artifacts.require('MainToken');

    const Crowdsale = artifacts.require('TemplateCrowdsale');
    if (network == "test" || network == "development")
        return;

    await deployer.deploy(
        Token
    );
    let TokenInst = await Token.deployed();
    console.log("Token =", TokenInst.address);
    await deployer.deploy(
        Crowdsale, TokenInst.address
    );
    let CrowdsaleInst = await Crowdsale.deployed();
    console.log("Crowdsale =", CrowdsaleInst.address);
};