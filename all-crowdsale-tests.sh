#!/usr/bin/env bash
set -e
# remove solc from truffle to use our version
rm -rf node_modules/truffle/node_modules/solc
for file in "templated-tests/configs/crowdsale"/**/*
do
  echo "testing file "$file
  source templated-tests/compile-crowdsale-template.sh $file && source templated-tests/test-crowdsale-template.sh $file || error "failed test "$file
done
