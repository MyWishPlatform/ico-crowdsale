#!/usr/bin/env bash
rm -rf build
rm -f contracts/TemplateCrowdsale.sol contracts/BonusableCrowdsale.sol test/templateCrowdsale.js
source templated-tests/preprocess-template.sh $1
node node_modules/.bin/truffle compile