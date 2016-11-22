#!/usr/bin/env node
'use strict'

const yargs = require('yargs')
// const chalk = require('chalk')
// const figures = require('figures')
// const ms = require('ms')
// const so = require('so')

const client = require('.')



const argv = yargs.argv

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    sms
\n`)
	process.exit()
}



// todo
