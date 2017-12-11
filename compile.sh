#!/usr/bin/env bash
c-preprocessor --config c-preprocessor-config.json template/contracts/MyWishConsts.sol contracts/MyWishConsts.sol
c-preprocessor --config c-preprocessor-config.json template/test/myWishCrowdsale.js test/myWishCrowdsale.js
rm -rf build
truffle compule
truffle migrate
truffle test