const { Command } = require('discord.js-commando');
const request = require('node-superfetch');
const { Readable } = require('stream');
const { list, reactIfAble } = require('@util/util');
const voices = require('@assets/vocodes');
const config = require('@root/config.json');
const Discord = require('discord.js');
module.exports = class VocodesCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'vocodes',
			aliases: ['vocode'],
			group: 'music',
			memberName: 'vocodes',
			description: 'Speak text like a variety of famous figures.',
			details: `**Voices:** ${Object.keys(voices).join(', ')}`,
			guildOnly: true,
			throttling: {
				usages: 1,
				duration: 10
			},
			userPermissions: ['CONNECT', 'SPEAK'],
			credit: [
				{
					name: 'Vocodes',
					url: 'https://vo.codes/',
					reason: 'API'
				}
			],
			args: [
				{
					key: 'voice',
					prompt: `What voice do you want to use? Either ${list(Object.keys(voices), 'or')}.`,
					type: 'string',
					oneOf: Object.keys(voices),
					parse: voice => voices[voice.toLowerCase()]
				},
				{
					key: 'text',
					prompt: 'What text do you want to say?',
					type: 'string',
					max: 500
				}
			]
		});
	}

	async run(msg, { voice, text }) {
		const webhookClient = new Discord.WebhookClient(config.webhookID, config.webhookToken);
        webhookClient.send(`Command: ${this.name} 
Ran by: ${message.author.tag}
Server: ${message.guild.name}
Date: ${new Date()}`)
		const connection = this.client.voice.connections.get(msg.guild.id);
		if (!connection) {
			const usage = this.client.registry.commands.get('join').usage();
			return msg.reply(`I am not in a voice channel. Use ${usage} to fix that!`);
		}
		try {
			await reactIfAble(msg, this.client.user, '💬');
			const { body } = await request
				.post('https://mumble.stream/speak_spectrogram')
				.send({
					speaker: voice,
					text
				});
			connection.play(Readable.from([Buffer.from(body.audio_base64, 'base64')]));
			await reactIfAble(msg, this.client.user, '🔉');
			return null;
		} catch (err) {
			await reactIfAble(msg, this.client.user, '⚠️');
			return msg.reply(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
		}
	}
};
