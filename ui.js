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



const table = () => new Table({
	chars: {
		top:    '', 'top-mid':    '', 'top-left':    '', 'top-right':    '',
		bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
		left:   '', 'left-mid':   '',  mid:          '', 'mid-mid':      '',
		right:  '', 'right-mid':  '',  middle:       ' '
	},
	style: {'padding-left': 1, 'padding-right': 0}
})

const newline = /(\n|\r\n|\r)/

const height = (str) => (str.match(newline) || []).length + 1

const spawn = (cmd, args, stdin, stdout) => new Promise((yay, nay) => {
	const proc = childProcess.spawn(cmd, args, {
		stdio: [stdin, stdout, 'ignore']
	})
	proc.on('close', (code) => {
		if (code === 0) yay()
		else nay()
	})
	proc.on('error', () => yay())
})

const tmpFile = () => new Promise((yay, nay) => {
	tmp.tmpName((err, path) => {
		if (err) nay(err)
		else yay(path)
	})
})

const readFile = (path) => new Promise((yay, nay) => {
	fs.stat(path, (err, stats) => {
		if (err) {
			if (err.code === 'ENOENT') return yay(null)
			return nay(err)
		}
		if (!stats.isFile()) return yay(null)
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) return nay(err)
			yay(data)
		})
	})
})



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

	query: function () {
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
			return spawn(cmd, [file], process.stdin, process.stdout)
			.then(() => readFile(file))
		})
		.then((text) => [text, resume])
		.catch((err) => [null, resume])
	},

	_: function (c) {
		if (c !== 'c') return this.bell()
		if (this.querying) return this.bell()

		this.query()
		.then(([text, resume]) => {
			this.out.write('todo: send the following message:\n' + text)
			this.height = 1 + height(text)
			setTimeout(resume, 2000)
		})
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
		out += '\n'
		out += this.message.text
		return out
	},

	renderMessages: function () {
		const out = table()
		let i = 0
		for (let message of this.messages) {
			out.push([
				i === this.cursor ? chalk.cyan(figures.play) : ' ',
				chalk.gray(ms(Date.now() - message.when) + ' ago'),
				chalk.yellow(message.to),
				message.text.slice(0, 30)
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
			out = this.renderNoMessages()
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
		ui.messages = messages
		ui.render()
	})
	.catch((err) => {
		ui.error = err.message
	})

	return wrap(ui)
}

module.exports = ui
