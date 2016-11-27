#!/usr/bin/env node
'use strict'

const chalk = require('chalk')
const Table = require('cli-table2')
const ms = require('ms')
const esc = require('ansi-escapes')
const wrap = require('prompt-skeleton')
const figures = require('figures')
const childProcess = require('child_process')
const tmp = require('tmp')
const fs = require('fs')
const trim = require('trim-newlines')
const { width, height } = require('window-size')

const {
	table, newline, spawn, tmpFile, readFile, writeFile
} = require('./util')



const UI = {
	moveCursor: function (n) {
		this.cursor = n
		if (this.message) this.message = this.messages[this.cursor]
	},

	abort: function () {
		if (this.message) {
			this.message = null
			this.render()
		} else {
			this.out.write('\n')
			this.close()
		}
	},
	submit: function () {
		if (this.message) return this.bell()
		this.message = this.messages[this.cursor]
		this.render()
	},

	first: function () {
		this.moveCursor(0)
		this.render()
	},
	last: function () {
		this.moveCursor(this.messages.length - 1)
		this.render()
	},

	up: function () {
		if (this.cursor === 0) return this.bell()
		this.moveCursor(this.cursor - 1)
		this.render()
	},
	down: function () {
		if (this.cursor === (this.messages.length - 1)) return this.bell()
		this.moveCursor(this.cursor + 1)
		this.render()
	},

	query: function (message) {
		const self = this
		const clear = () => {
			self.out.write(esc.eraseScreen + esc.cursorTo(0, 0))
		}
		const resume = () => {
			clear()
			self.resume()
			self.querying = false
			self.render()
		}
		this.querying = true
		this.pause()
		clear()

		return tmpFile()
		.then((file) => {
			const cmd = (process.env.EDITOR || 'nano')
			return writeFile(file, '# ' + message)
			.then(() => spawn(cmd, [file], process.stdin, process.stdout))
			.then(() => readFile(file))
		})
		.then((text) => {
			text = text.split(newline)
			if (text[0].slice(0, 1) === '#') text = text.slice(1)
			text = trim(text.join('\n'))
			return [text, resume]
		})
		.catch((err) => [null, resume])
	},

	_: function (key) {
		if (this.querying) return this.bell()

		if (key === 'r') {
			const to = this.messages[this.cursor].to
			this.query('Please enter a message. This line will be ignored.')
			.then(([text, resume]) => {
				this.out.write(`todo: send the following message to ${to}:\n` + text)
				setTimeout(resume, 2000)
			})

		} else if (key === 'c') {
			this.query('Please enter a message. This line will be ignored.')
			.then(([text, resume]) => {
				this.query('Please enter a phone number.')
				.then(([to]) => {
					this.out.write(`todo: send the following message to ${to}:\n` + text)
					setTimeout(resume, 2000)
				})
			})

		} else return this.bell()
	},

	renderStatus: function () {
		return [
			  this.loading ? figures.radioOn : figures.radioOff
			, this.error ? chalk.red(this.error) : ''
			, chalk.gray([
				'no messages', '1 message'
			][this.messages.length] || `${this.messages.length} messages`)
		].join(' ')
	},

	renderMessage: function () {
		let out = ''
		const message = this.message
		out += chalk.gray(ms(Date.now() - message.when) + ' ago')
		out += ' '
		out += chalk.yellow(message.outbound ? message.to : message.from)
		out += ' '
		out += message.inbound ? chalk.blue('in') : chalk.red('out'),
		out += '\n'
		out += this.message.text
		return out
	},

	renderMessages: function () {
		const out = table([7, 15, 3, width - 7 - 15 - 3])
		let i = 0
		for (let message of this.messages) {
			const text = message.text
			out.push([
				chalk.gray(ms(Date.now() - message.when) + ' ago'),
				chalk.yellow(message.outbound ? message.to : message.from),
				message.inbound ? chalk.blue('in') : chalk.red('out'),
				i === this.cursor ? chalk.cyan(text) : text
			])
			i++
		}
		return out.toString()
	},

	render: function (first) {
		if (first) this.out.write('\n'.repeat(height))
		if (this.querying) return

		let out = esc.clearScreen + esc.cursorTo(0, 0)
			+ this.renderStatus() + '\n'

		if (this.messages.length === 0) {
		} else if (this.message) {
			out += this.renderMessage()
		} else {
			out += this.renderMessages()
		}

		this.out.write(out + esc.cursorHide)
	}
}



const defaults = {
	  messages: []
	, message: null
	, cursor:  0

	, querying: false

	, error: null
}

const ui = (client, opt) => {
	if (Array.isArray(opt) || 'object' !== typeof opt) opt = {}

	const ui = Object.assign(Object.create(UI), defaults, opt)
	const result = wrap(ui)

	ui.loading = true
	ui.render()
	client.list()
	.then((messages) => {
		ui.loading = false
		ui.messages = messages.sort((m1, m2) => m2.when - m1.when)
		ui.render()
	})
	.catch((err) => {
		ui.loading = false
		ui.error = err.message
		ui.render()
	})

	return result
}

module.exports = ui
