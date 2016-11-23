#!/usr/bin/env node
'use strict'

const yargs = require('yargs')
const chalk = require('chalk')

const sms = require('.')
const ui = require('./ui')



const argv = yargs.argv

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    sms
\n`)
	process.exit()
}

const showError = (msg) => {
	process.stdout.write(chalk.red(msg) + '\n')
}

if (!process.env.TWILIO_SID) {
	showError('Missing TWILIO_SID env variable.')
	process.exit(1)
}
if (!process.env.TWILIO_TOKEN) {
	showError('Missing TWILIO_TOKEN env variable.')
	process.exit(1)
}

ui(sms(process.env.TWILIO_SID, process.env.TWILIO_TOKEN))
.catch(showError)
