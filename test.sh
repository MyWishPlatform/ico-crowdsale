#!/usr/bin/env bash
node node_modules/.bin/c-preprocessor --config c-preprocessor-config.json template/test/templateCrowdsale.js test/templateCrowdsale.js
node node_modules/truffle/build/cli.bundled.js test ./test/templateCrowdsale.js