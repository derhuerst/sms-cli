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
		if (this.message) this.message = this.messages[cursor]
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

	clear: function () {
		this.out.write(esc.eraseScreen + esc.cursorTo(0, 0))
	},
	_: function (c) {
		if (c !== 'c') return this.bell()
		if (this.composing) return this.bell()

		this.composing = true
		this.pause()
		this.clear()
		const self = this
		const resume = () => {
			self.clear()
			self.resume()
			self.composing = false
			self.render()
		}

		tmpFile()
		.then((file) => {
			const cmd = (process.env.EDITOR || 'nano')
			return spawn(cmd, [file], process.stdin, process.stdout)
			.then(() => readFile(file))
		})
		.then((text) => {
			if (!text) return resume()
			self.out.write('todo: send the message.')
			setTimeout(resume, 2000)
		})
		.catch(resume)
	},

	render: function (first) {
		if (this.composing) return
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
		if (this.message) {
			this.out.write(
				  ms(Date.now() - this.message.when) + ' ago'
				+ ' '
				+ this.message.to
				+ '\n'
				+ this.message.text
			)
			this.height = height(this.message.text) + 1
			return
		}

		this.height = 0
		const out = table()
		let i = 0
		for (let message of this.messages) {
			out.push([
				i === this.cursor ? figures.play : ' ',
				ms(Date.now() - message.when) + ' ago',
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
	, message: null
	, cursor:  0

	, composing: false
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
