#!/usr/bin/env node
'use strict'

const yargs = require('yargs')
const chalk = require('chalk')
const Conf = require('conf')
const prompt = require('text-prompt')

const sms = require('.')
const ui = require('./ui')



const showError = (msg) => {
	process.stdout.write(chalk.red(msg) + '\n')
}

const query = (msg) =>
	new Promise((resolve, reject) => {
		prompt(msg)
		.once('submit', resolve)
		.once('abort', () => reject('You rejected the prompt.'))
	})



const argv = yargs.argv
const conf = new Conf()

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    sms
\n`)
	process.exit()
}



let chain = Promise.resolve()

if (!conf.get('sid')) {
	if (process.env.TWILIO_SID) conf.set('sid', process.env.TWILIO_SID)
	else chain = chain.then(
		query('Please enter your Twilio SID.')
		.then((sid) => {
			conf.set('sid', sid)
		})
	)
}

if (!conf.get('token')) {
	if (process.env.TWILIO_TOKEN) conf.set('token', process.env.TWILIO_SID)
	else chain = chain.then(
		query('Please enter your Twilio token.')
		.then((token) => {
			conf.set('token', token)
		})
	)
}

chain.then(() => {
	const sid = conf.get('sid')
	const token = conf.get('token')
	ui(sms(sid, token))
})
