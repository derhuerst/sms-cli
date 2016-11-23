'use strict'

const twilio = require('twilio')

const sms = (sid, token) => {
	const client = twilio(sid, token)

	// mock
	return {
		list: () => Promise.resolve([
			{
				from: '+49494949494',
				to: '+21212121212',
				text: 'foo bar baz',
				when: Date.now() - 30 * 1000
			},
			{
				from: '+49494949494',
				to: '+60606060606',
				text: 'Hello World!',
				when: Date.now() - 3.5 * 60 * 1000
			}
		])
	}

	return {
		list: () => client.sms.messages.list()
	}
}

module.exports = sms
