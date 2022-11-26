#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const functions = require("./index");

const argv = yargs(hideBin(process.argv)).argv;
const command = argv._[0];
functions[command](argv);
