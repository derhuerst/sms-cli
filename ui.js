#!/usr/bin/env node
'use strict'

// const chalk = require('chalk')
const Table = require('cli-table2')
const ms = require('ms')
// const figures = require('figures')
// const so = require('so')



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



const ui = (client) => new Promise((yay, nay) => {
	client.list()
	.then((messages) => {
		// console.log(messages)
		process.stdout.write(renderMessages(messages))
		yay()
	}, nay)
})

module.exports = ui
