#!/usr/bin/env bash
# rename OpenZeppelin dependency to correct token
sed -i "s/ERC20/BEP20/g" build/MainToken.sol
sed -i "/ethereum/d" build/MainToken.sol