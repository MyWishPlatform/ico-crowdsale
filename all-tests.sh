#!/usr/bin/env bash
# remove solc from truffle to use our version
rm -rf node_modules/truffle/node_modules/solc
for file in "templated-tests/configs"/**/*
do
  echo "testing file "$file
  source templated-tests/compile-template.sh $file && source templated-tests/test-template.sh $file || error "failed test "$file
done