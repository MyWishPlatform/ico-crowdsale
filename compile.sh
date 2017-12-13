#!/usr/bin/env bash
rm -rf build
source preprocess.sh
node node_modules/truffle/build/cli.bundled.js compile