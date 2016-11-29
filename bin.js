#!/usr/bin/env node
'use strict'

const yargs = require('yargs')
const chalk = require('chalk')
const Conf = require('conf')
const text = require('text-prompt')
const select = require('select-prompt')
const pipe = require('p-pipe')

const sms = require('.')
const ui = require('./ui')



const showError = (err) => {
	const msg = err.message || err.toString()
	process.stdout.write(chalk.red(msg) + '\n')
}

const prompt = (prompt, ...args) =>
	new Promise((resolve, reject) => {
		prompt(...args)
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



const chain = []
let client

if (!conf.get('sid')) {
	if (process.env.TWILIO_SID) conf.set('sid', process.env.TWILIO_SID)
	else chain.push(() =>
		prompt(text, 'Please enter your Twilio SID.')
		.then((sid) => {
			conf.set('sid', sid)
		})
	)
}

if (!conf.get('token')) {
	if (process.env.TWILIO_TOKEN) conf.set('token', process.env.TWILIO_SID)
	else chain.push(() =>
		prompt(text, 'Please enter your Twilio token.')
		.then((token) => {
			conf.set('token', token)
		})
	)
}

chain.push(() => {
	client = sms(conf.get('sid'), conf.get('token'))
})

if (!conf.get('number')) {
	if (process.env.TWILIO_NUMBER) conf.set('number', process.env.TWILIO_NUMBER)
	else chain.push(() =>
		client.numbers()
		.then((numbers) => {
			numbers = numbers.map((nr) => ({
				title: nr.name, value: nr.nr
			}))
			return prompt(select, 'Please select a number.', numbers)
		})
		.then((number) => {
			console.error(number)
			conf.set('number', number)
		})
	)
}

pipe(...chain)()
.then(() => ui(client))
.catch(showError)
