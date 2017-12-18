#!/usr/bin/env bash
node node_modules/.bin/c-preprocessor --config pre-firstpass-config.json template/test/templateCrowdsale.js build/templateCrowdsale.js
node node_modules/.bin/c-preprocessor --config $1 build/templateCrowdsale.js test/templateCrowdsale.js
node node_modules/.bin/truffle test