#!/bin/bash


if docker-compose ls | grep -q 'chain1'
then
  ./test-local/cmd.sh stop1
  sleep 2
fi

if docker-compose ls | grep -q 'chain2'
then
  ./test-local/cmd.sh stop2
  sleep 2
fi


./test-local/cmd.sh init1
sleep 2
./test-local/cmd.sh init2
sleep 2
./test-local/cmd.sh start1
sleep 2
./test-local/cmd.sh start2
sleep 2
