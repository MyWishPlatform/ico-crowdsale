#!/usr/bin/env bash
set -e
rm -rf build
rm -f \
contracts/TemplateCrowdsale.sol \
contracts/BonusableCrowdsale.sol \
contracts/MainToken.sol \
test/templateCrowdsale.js
source templated-tests/preprocess-crowdsale-template.sh $1
node_modules/.bin/truffle compile --all
./combineContracts.js MainToken TemplateCrowdsale