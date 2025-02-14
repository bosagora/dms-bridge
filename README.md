# KIOS Bridge

## Install NodeJS

https://nodejs.org/en/download

## Install yarn

```shell
npm install -g yarn
```

## Install Project

```shell
git clone https://github.com/kios-coin/kios-bridge.git
cd dms-bridge
git checkout kios/v2.x.x
yarn install
```

## Test Project

```shell
cd packages/contracts
cp -r env/.env.sample env/.env
yarn run test
```
