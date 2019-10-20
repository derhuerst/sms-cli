'use strict'

const Twilio = require('twilio')
const trim = require('trim-newlines')

const sms = (sid, token) => {
	const client = new Twilio(sid, token)
	return {
		numbers: async () => {
			const res = await client.incomingPhoneNumbers.list()
			return res.incomingPhoneNumbers.map((number) => ({
				id: number.sid,
				name: number.friendlyName,
				nr: number.phoneNumber,
			}))
		},

		send: async (from, to, text) => {
			const msg = await client.messages.create({
				from, to, body: text
			})
			return message.sid
		},

		list: async () => {
			const res = await client.messages.list()
			return res.smsMessages.map((message) => ({
				id: message.sid,
				when: message.dateSent,
				from: message.from,
				to: message.to,
				text: trim(message.body),
				inbound: message.direction.slice(0, 7) === 'inbound',
				outbound: message.direction.slice(0, 8) === 'outbound'
			}))
		},

		delete: async (id) => {
			await client.messages(id).delete()
		}
	}
}

module.exports = sms
