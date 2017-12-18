#!/usr/bin/env bash
rm -rf build
rm -f contracts/TemplateCrowdsale.sol contracts/BonusableCrowdsale.sol test/templateCrowdsale.js
source preprocess.sh
node node_modules/.bin/truffle compile