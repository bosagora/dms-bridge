#!/bin/bash

./test-local/start-chain.sh

rm -rf .openzeppelin
npx hardhat test ./test-local/localtest.ts

./test-local/stop-chain.sh

