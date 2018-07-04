#!/usr/bin/env bash
CONFIG=$1
CONFIG="${CONFIG:-c-preprocessor-config.json}"
source $(dirname "$0")/templated-tests/test-token-template.sh "$CONFIG"
