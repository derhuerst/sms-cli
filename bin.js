#!/usr/bin/env node
'use strict'

const yargs = require('yargs')
const chalk = require('chalk')
const Table = require('cli-table2')
const ms = require('ms')
// const figures = require('figures')
// const so = require('so')

const sms = require('.')



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

const table = () => new Table({
	chars: {
		top:    '', 'top-mid':    '', 'top-left':    '', 'top-right':    '',
		bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
		left:   '', 'left-mid':   '',  mid:          '', 'mid-mid':      '',
		right:  '', 'right-mid':  '',  middle:       ' '
	},
	style: {'padding-left': 1, 'padding-right': 0}
})

const renderMessages = (messages) => {
	const out = table()
	for (let message of messages) {
		out.push([
			ms(Date.now() - message.when),
			message.to,
			message.text.slice(0, 30)
		])
	}
	return out.toString() + '\n'
}



if (!process.env.TWILIO_SID) {
	showError('Missing TWILIO_SID env variable.')
	process.exit(1)
}
if (!process.env.TWILIO_TOKEN) {
	showError('Missing TWILIO_TOKEN env variable.')
	process.exit(1)
}
const client = sms(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)

client.list()
.then((messages) => {
	// console.log(messages)
	process.stdout.write(renderMessages(messages))
}, console.error)
