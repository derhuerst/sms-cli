#!/usr/bin/env node
'use strict'

// const chalk = require('chalk')
const Table = require('cli-table2')
const ms = require('ms')
const esc = require('ansi-escapes')
const wrap = require('prompt-skeleton')
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

// const renderMessages = (messages) => {
// 	const out = table()
// 	for (let message of messages) {
// 		out.push([
// 			ms(Date.now() - message.when),
// 			message.to,
// 			message.text.slice(0, 30)
// 		])
// 	}
// 	return out.toString() + '\n'
// }



const UI = {
	abort: function () {
		this.out.write('\n')
		this.close()
	},

	first: function () {
		this.cursor = 0
		this.render()
	},
	last: function () {
		this.cursor = this.messages.length - 1
		this.render()
	},

	up: function () {
		if (this.cursor === 0) return this.bell()
		this.cursor = this.cursor - 1
		this.render()
	},
	down: function () {
		if (this.cursor === (this.messages.length - 1)) return this.bell()
		this.cursor = this.cursor + 1
		this.render()
	},

	render: function (first) {
		if (first) this.out.write(esc.cursorHide)
		else this.out.write(esc.eraseLines(this.messages.length + 1))

		if (this.error) return this.out.write(chalk.red(this.error) + '\n')

		const out = table()
		for (let message of this.messages) {
			ms(Date.now() - message.when),
			message.to,
			message.text.slice(0, 30)
		}

		this.out.write(out.toString())
	}
}



const defaults = {
	  messages: []
	, cursor:  0

	, error: null
}

const ui = (client, opt) => {
	if (Array.isArray(opt) || 'object' !== typeof opt) opt = {}

	const ui = Object.assign(Object.create(UI), defaults, opt)

	client.list()
	.then((messages) => {
		ui.messages = messages
	})
	.catch((err) => {
		ui.error = err.message
	})

	return wrap(ui)
}

module.exports = ui
