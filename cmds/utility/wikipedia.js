  

const { shorten } = require('@util/util');
module.exports = class WikipediaCommand extends Commando.Command {
	constructor(client) {
		super(client, {
            name: 'wikipedia',
            aliases: ['wiki'],
			group: 'utility',
			memberName: 'wikipedia',
			description: 'Searches Wikipedia for your query.',
			clientPermissions: ['EMBED_LINKS'],
			credit: [
				{
					name: 'Wikipedia',
					url: 'https://www.wikipedia.org/',
					reason: 'API',
					reasonURL: 'https://en.wikipedia.org/w/api.php'
				}
			],
			args: [
				{
					key: 'query',
					prompt: 'What article would you like to search for?',
					type: 'string'
				}
			]
		});
	}

	async run(message, { query }) {
		const webhookClient = new Discord.WebhookClient(process.env.WEBHOOK_ID, process.env.WEBHOOK_TOKEN);
        webhookClient.send(`Command: ${this.name} 
Ran by: ${message.author.tag}
Server: ${message.guild.name}
Date: ${new Date()}
-------------------------------------------------------------------------------------------`)
		try {
			const { body } = await request
				.get('https://en.wikipedia.org/w/api.php')
				.query({
					action: 'query',
					prop: 'extracts|pageimages',
					format: 'json',
					titles: query,
					exintro: '',
					explaintext: '',
					pithumbsize: 150,
					redirects: '',
					formatversion: 2
				});
			const data = body.query.pages[0];
			if (data.missing) return message.say('Could not find any results.');
			const embed = new Discord.MessageEmbed()
				.setColor(0xE7E7E7)
				.setTitle(data.title)
				.setAuthor('Wikipedia', 'https://i.imgur.com/Z7NJBK2.png', 'https://www.wikipedia.org/')
				.setThumbnail(data.thumbnail ? data.thumbnail.source : null)
				.setURL(`https://en.wikipedia.org/wiki/${encodeURIComponent(query).replace(')', '%29')}`)
				.setDescription(shorten(data.extract.replace('\n', '\n\n')));
			return message.embed(embed);
		} catch (err) {
			return message.reply(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
		}
	}
};