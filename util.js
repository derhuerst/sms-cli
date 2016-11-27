#!/usr/bin/env node
'use strict'

const Table = require('cli-table2')
const childProcess = require('child_process')
const tmp = require('tmp')
const fs = require('fs')
const trim = require('trim-newlines')



const table = (cols = []) => new Table({
	chars: {
		top:    '', 'top-mid':    '', 'top-left':    '', 'top-right':    '',
		bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
		left:   '', 'left-mid':   '',  mid:          '', 'mid-mid':      '',
		right:  '', 'right-mid':  '',  middle:       ' '
	},
	style: {'padding-left': 0, 'padding-right': 0},
	colWidths: cols, wordWrap: true
})

const newline = /(\n|\r\n|\r)/

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

const writeFile = (path, data) => new Promise((yay, nay) => {
	fs.writeFile(path, data, (err) => {
		if (err) return nay(err)
		yay()
	})
})



module.exports = {table, newline, spawn, tmpFile, readFile, writeFile}
