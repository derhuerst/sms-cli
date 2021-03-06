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
			const cmd = process.env.EDITOR || (process.platform === 'win32' ? 'notepad.exe' : 'nano')
			return writeFile(file, '# ' + message)
			.then(() => spawn(cmd, [file], process.stdin, process.stdout))
			.then(() => readFile(file))
		})
		.then((text) => {
			text = text.split(newline)
			if (text[0].slice(0, 1) === '#') text = text.slice(1)
			text = trim(text.join('\n'))
			if (text.length === 0) text = null
			return [text, resume]
		})
		.catch((err) => [null, resume])
	},

	compose: function (receiver) {
		const sender = this.number
		let message
		this.query('Please enter a message. This line will be ignored.')
		.then(([text, resume]) => {
			if (!text) {
				this.error = 'Message is empty.'
				return resume()
			}
			message = text

			if (!receiver) return this.query('Enter a phone number.')
			return [receiver, resume]
		})
		.then(([number, resume]) => {
			if (!number) {
				this.error = 'Invalid phone number.'
				return resume()
			}
			receiver = number

			resume()
			this.loading = true
			this.render()
			this.send(sender, receiver, message)
			.then(() => {
				this.error = null
				this.render()
				this.fetch()
			})
			.catch((err) => {
				this.loading = false
				this.error = err.message
				this.render()
			})
		})
	},

	_: function (key) {
		if (this.querying) return this.bell()

		if (key === 'j') return this.down()
		if (key === 'k') return this.up()

		if (key === 'f') return this.fetch()

		if (key === 'r') {
			const message = this.messages[this.cursor]
			return this.compose(message.outbound ? message.to : message.from)
		}
		if (key === 'c') return this.compose()

		if (key === 'd') {
			const message = this.message || this.messages[this.cursor]
			return this.remove(message.id)
		}

		return this.bell()
	},

	renderStatus: function () {
		const l = this.messages.length
		return [
			  this.loading ? figures.radioOn : figures.radioOff
			, this.error ? chalk.red(this.error) : null
			, chalk.gray(['no messages', '1 message'][l] || `${l} messages`)
			, chalk.gray(this.number)
		].filter((s) => !!s).join(' ')
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
		const out = table([3, 15, 3, width - 3 - 15 - 3 - 3]) // columns + 3x padding of 1
		let i = 0
		for (let message of this.messages) {
			out.push([
				chalk.gray(ms(Date.now() - message.when)),
				chalk.yellow(message.outbound ? message.to : message.from),
				message.inbound ? chalk.blue('in') : chalk.red('out'),
				i === this.cursor ? chalk.cyan(message.text) : message.text
			])
			i++
		}
		return out.toString()
	},

	renderBindings: function () {
		const out = [
			'F to fetch',
			this.message ? 'ctrl+D to go back' : 'ctrl+D to leave',
			'C to compose',
		]
		if (!this.error) out.push(
			this.messages.length > 0 ? 'R to reply' : '',
			this.messages.length > 0 ? 'D to delete' : ''
		)
		return chalk.gray(out.filter((s) => !!s).join(' | '))
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

		out += '\n' + this.renderBindings()
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

const ui = (client, number, opt) => {
	if (Array.isArray(opt) || 'object' !== typeof opt) opt = {}

	const ui = Object.assign(Object.create(UI), defaults, opt)
	ui.number = number
	const result = wrap(ui)

	const fetch = () => {
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
	}
	fetch()
	setInterval(fetch, 5 * 60 * 1000)

	const remove = (id) => {
		ui.loading = true
		ui.render()
		client.delete(id)
		.then(() => {
			ui.messages = ui.messages.filter((m) => m.id !== id)
		})
		.catch((err) => {
			ui.error = err.message
			ui.render()
		})
		.then(() => {
			ui.loading = false
			ui.render()
		})
	}

	ui.fetch = fetch
	ui.remove = remove
	ui.send = client.send
	return result
}

module.exports = ui
