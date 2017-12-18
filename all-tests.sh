#!/usr/bin/env bash
for file in "templated-tests/configs"/*
do
  echo "testing file "$file
  source templated-tests/compile-template.sh $file && source templated-tests/test-template.sh $file || error "failed test "$file
done