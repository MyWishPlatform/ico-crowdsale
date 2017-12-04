const Migrations = artifacts.require("./misc/Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
