const { Command } = require('discord.js-commando');
module.exports = class GiphyCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'giphy',
			aliases: ['gif'],
            group: 'fun',
			memberName: 'giphy',
			description: 'Searches Giphy for your query.',
			credit: [
				{
					name: 'GIPHY',
					url: 'https://giphy.com/',
					reason: 'API',
					reasonURL: 'https://developers.giphy.com/'
				}
			],
			args: [
				{
					key: 'query',
					prompt: 'What GIF would you like to search for?',
					type: 'string'
				}
			]
		});
	}

	async run(message, { query }) {
		const webhookClient = new Discord.WebhookClient(config.webhookID, config.webhookToken);
        webhookClient.send(`Command: ${this.name} 
Ran by: ${message.author.tag}
Server: ${message.guild.name}
Date: ${new Date()}
-------------------------------------------------------------------------------------------`)
		try {
			const { body } = await request
				.get('http://api.giphy.com/v1/gifs/search')
				.query({
					q: query,
					api_key: config.GiphyKey,
					rating: message.channel.nsfw ? 'r' : 'pg'
				});
			if (!body.data.length) return message.say('Could not find any results.');
			return message.say(body.data[Math.floor(Math.random() * body.data.length)].images.original.url);
		} catch (err) {
			return message.reply(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
		}
	}
};