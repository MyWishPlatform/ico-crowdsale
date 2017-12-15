#!/usr/bin/env bash
node node_modules/.bin/c-preprocessor --config c-preprocessor-config.json template/test/templateCrowdsale.js test/templateCrowdsale.js
node_modules/.bin/truffle test