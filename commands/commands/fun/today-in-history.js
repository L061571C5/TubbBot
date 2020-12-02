

module.exports = {
    commands: ['todayinhistory', 'tih'],
    description: 'gives info about what important event happend today in hisotry',
    async callback(message, args) {
        const webhookClient = new Discord.WebhookClient(config.webhookID, config.webhookToken);
        webhookClient.send(`Command: todayinhistory 
Ran by: ${message.author.tag}
Server: ${message.guild.name}
Date: ${new Date()}
-------------------------------------------------------------------------------------------`)
        const month = parseInt(args[0]);
        const day = parseInt(args[1]);

        if(isNaN(month)) {
            return message.reply('please enter a valid month (ex. 4 13');
        }

        if(isNaN(day)) {
            return message.reply('please enter a valid day (ex. 3 28)');
        }

        const date = month && day ? `/${month}/${day}` : '';
		try {
			const { text } = await request.get(`http://history.muffinlabs.com/date${date}`);
			const body = JSON.parse(text);
			const events = body.data.Events;
			const event = events[Math.floor(Math.random() * events.length)];
			const embed = new Discord.MessageEmbed()
				.setColor(0x9797FF)
				.setURL(body.url)
				.setTitle(`On this day (${body.date})...`)
				.setTimestamp()
				.setDescription(`${event.year}: ${event.text}`)
				.addField('❯ See More',
					event.links.map(link => `[${link.title}](${link.link.replace(/\)/g, '%29')})`).join(', '));
            
            return message.channel.send(embed);
        } 
        catch (err) {
			if (err.status === 404 || err.status === 500) return message.reply('Invalid date.');
			return message.reply(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
		}
    }
}