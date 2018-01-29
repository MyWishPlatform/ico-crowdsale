#!/usr/bin/env bash
CONFIG=$1
CONFIG="${CONFIG:-c-preprocessor-config.json}"
source templated-tests/compile-template.sh "$CONFIG"