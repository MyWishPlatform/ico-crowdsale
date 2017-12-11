#!/usr/bin/env bash
node_modules/.bin/c-preprocessor --config c-preprocessor-config.json template/contracts/MyWishConsts.sol contracts/MyWishConsts.sol
node_modules/.bin/c-preprocessor --config c-preprocessor-config.json template/test/myWishCrowdsale.js test/myWishCrowdsale.js
rm -rf build
truffle compile