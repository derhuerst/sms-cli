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

const {
	table, newline, height, spawn, tmpFile, readFile, writeFile
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
				this.height = 1 + height(text)
				setTimeout(resume, 2000)
			})

		} else if (key === 'c') {
			this.query('Please enter a message. This line will be ignored.')
			.then(([text, resume]) => {
				this.query('Please enter a phone number.')
				.then(([to]) => {
					this.out.write(`todo: send the following message to ${to}:\n` + text)
					this.height = 1 + height(text)
					setTimeout(resume, 2000)
				})
			})

		} else return this.bell()
	},

	renderError: function () {
		return chalk.red(this.error)
	},

	renderNoMessages: function () {
		return chalk.gray('no messages')
	},

	renderMessage: function () {
		let out = ''
		const message = this.message
		out += chalk.gray(ms(Date.now() - message.when) + ' ago')
		out += ' '
		out += chalk.yellow(message.to)
		out += ' '
		out += message.inbound ? chalk.blue('in') : chalk.red('out'),
		out += '\n'
		out += this.message.text
		return out
	},

	renderMessages: function () {
		const out = table()
		let i = 0
		for (let message of this.messages) {
			const text = message.text.slice(0, 30)
			out.push([
				chalk.gray(ms(Date.now() - message.when) + ' ago'),
				chalk.yellow(message.to),
				message.inbound ? chalk.blue('in') : chalk.red('out'),
				i === this.cursor ? chalk.cyan(text) : text
			])
			i++
		}
		return out.toString()
	},

	render: function (first) {
		if (this.querying) return
		if (first) this.out.write(esc.cursorHide)
		else this.out.write(esc.eraseLines(this.height))

		let out
		if (this.error) {
			out = this.renderError()
		} else if (this.messages.length === 0) {
			out = this.renderNoMessages()
		} else if (this.message) {
			out = this.renderMessage()
		} else {
			out = this.renderMessages()
		}
		this.height = height(out)
		this.out.write(out)
	}
}



const defaults = {
	  messages: []
	, message: null
	, cursor:  0

	, querying: false
	, height: 0

	, error: null
}

const ui = (client, opt) => {
	if (Array.isArray(opt) || 'object' !== typeof opt) opt = {}

	const ui = Object.assign(Object.create(UI), defaults, opt)

	client.list()
	.then((messages) => {
		ui.messages = messages.sort((m1, m2) => m2.when - m1.when)
		ui.render()
	})
	.catch((err) => {
		ui.error = err.message
	})

	return wrap(ui)
}

module.exports = ui
