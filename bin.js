#!/usr/bin/env node
'use strict'

const yargs = require('yargs')
const chalk = require('chalk')
const Conf = require('conf')
const text = require('text-prompt')
const select = require('select-prompt')

const argv = yargs.argv
const conf = new Conf()

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    sms
\n`)
	process.exit()
}

if (argv.number || argv.n) {
	process.stdout.write(conf.get('number') + '\n')
	process.exit(0)
}

const sms = require('.')
const ui = require('./ui')

const showError = (err) => {
	const msg = err.message || err.toString()
	process.stdout.write(chalk.red(msg) + '\n')
}

const prompt = (prompt, ...args) => {
	return new Promise((resolve, reject) => {
		prompt(...args)
		.once('submit', resolve)
		.once('abort', () => reject('You rejected the prompt.'))
	})
}

(async () => {

	let sid = conf.get('sid')
	if (!sid) {
		if (process.env.TWILIO_SID) sid = process.env.TWILIO_SID
		else {
			sid = await prompt(text, 'Please enter your Twilio SID.')
			conf.set('sid', sid)
		}
	}

	let token = conf.get('token')
	if (!token) {
		if (process.env.TWILIO_TOKEN) token = process.env.TWILIO_TOKEN
		else {
			token = await prompt(text, 'Please enter your Twilio token.')
			conf.set('token', token)
		}
	}

	const client = sms(sid, token)
	let number = conf.get('number')
	if (!number) {
		if (process.env.TWILIO_NUMBER) number = process.env.TWILIO_NUMBER
		else {
			const choices = (await client.numbers()).map((nr) => ({
				title: nr.name, value: nr.nr
			}))
			number = await prompt(select, 'Please select a number.', choices)
		}
	}

	await ui(client, number)

})()
.catch(showError)
