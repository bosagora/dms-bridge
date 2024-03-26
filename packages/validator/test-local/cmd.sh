#!/bin/bash

set -eu

system=""
case "$OSTYPE" in
  darwin*) system="darwin" ;;
  linux*) system="linux" ;;
  msys*) system="windows" ;;
  cygwin*) system="windows" ;;
  *) exit 1 ;;
esac
readonly system


if [ "$1" = "init1" ]; then

  if [ "$system" == "linux" ]; then
    sudo rm -rf ./test-local/chain1/node
  else
    rm -rf ./test-local/chain1/node
  fi

  mkdir -p ./test-local/chain1/node

  cp -rf ./test-local/chain1/config/template/node/* ./test-local/chain1/node

  docker run -it -v ./test-local/chain1/node:/data -v ./test-local/chain1/config:/config --name el-node --rm bosagora/agora-el-node:v2.0.1 --datadir=/data init /config/genesis.json

elif [ "$1" = "init2" ]; then

  if [ "$system" == "linux" ]; then
    sudo rm -rf ./test-local/chain2/node
  else
    rm -rf ./test-local/chain2/node
  fi

  mkdir -p ./test-local/chain2/node

  cp -rf ./test-local/chain2/config/template/node/* ./test-local/chain2/node

  docker run -it -v ./test-local/chain2/node:/data -v ./test-local/chain2/config:/config --name el-node --rm bosagora/agora-el-node:v2.0.1 --datadir=/data init /config/genesis.json

elif [ "$1" = "start1" ]; then

  docker compose -f ./test-local/chain1/docker-compose.yml up -d

elif [ "$1" = "stop1" ]; then

  docker compose -f ./test-local/chain1/docker-compose.yml down

elif [ "$1" = "start2" ]; then

  docker compose -f ./test-local/chain2/docker-compose.yml up -d

elif [ "$1" = "stop2" ]; then

  docker compose -f ./test-local/chain2/docker-compose.yml down
fi