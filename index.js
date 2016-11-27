'use strict'

const twilio = require('twilio')
const trim = require('trim-newlines')

const sms = (sid, token) => {
	const client = twilio(sid, token)
	return {
		  numbers: () =>
			client.incomingPhoneNumbers.list().then((data) =>
				data.incomingPhoneNumbers.map((number) => ({
					id: number.sid,
					name: number.friendlyName,
					nr: number.phoneNumber,
				}))
			)

		, send: (from, to, text) =>
			client.sms.messages.post({from, to, body: text})
			.then((message) => message.sid)

		, list: () =>
			client.sms.messages.list().then((data) =>
				data.smsMessages.map((message) => ({
					id: message.sid,
					when: message.dateSent,
					from: message.from,
					to: message.to,
					text: trim(message.body),
					inbound: message.direction.slice(0, 7) === 'inbound',
					outbound: message.direction.slice(0, 8) === 'outbound'
				}))
			)
	}
}

module.exports = sms
