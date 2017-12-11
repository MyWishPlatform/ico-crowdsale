#!/usr/bin/env bash
rm -rf build
node_modules/.bin/c-preprocessor --config c-preprocessor-config.json template/TemplateCrowdsale.sol contracts/TemplateCrowdsale.sol
truffle compile