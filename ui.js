#!/usr/bin/env node
'use strict'

const chalk = require('chalk')
const Table = require('cli-table2')
const ms = require('ms')
const esc = require('ansi-escapes')
const wrap = require('prompt-skeleton')
const figures = require('figures')



const table = () => new Table({
	chars: {
		top:    '', 'top-mid':    '', 'top-left':    '', 'top-right':    '',
		bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
		left:   '', 'left-mid':   '',  mid:          '', 'mid-mid':      '',
		right:  '', 'right-mid':  '',  middle:       ' '
	},
	style: {'padding-left': 1, 'padding-right': 0}
})



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
		console.error('first', first)
		if (first) this.out.write(esc.cursorHide)
		else this.out.write(esc.eraseLines(this.height))

		if (this.error) {
			this.out.write(chalk.red(this.error))
			this.height = 1
			return
		}
		if (this.messages.length === 0) {
			this.out.write(chalk.gray('no messages'))
			this.height = 1
			return
		}

		this.height = 0
		const out = table()
		let i = 0
		for (let message of this.messages) {
			out.push([
				i === this.cursor ? figures.play : ' ',
				ms(Date.now() - message.when),
				message.to,
				message.text.slice(0, 30)
			])
			this.height++
			i++
		}

		this.out.write(out.toString())
	}
}



const defaults = {
	  messages: []
	, cursor:  0

	, height: 0

	, error: null
}

const ui = (client, opt) => {
	if (Array.isArray(opt) || 'object' !== typeof opt) opt = {}

	const ui = Object.assign(Object.create(UI), defaults, opt)

	client.list()
	.then((messages) => {
		ui.messages = messages
		ui.render()
	})
	.catch((err) => {
		ui.error = err.message
	})

	return wrap(ui)
}

module.exports = ui
