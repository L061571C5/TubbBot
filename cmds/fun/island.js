const { Command } = require('discord.js-commando');
const { stripIndents } = require('common-tags');
const Collection = require('@discordjs/collection');
const { delay, awaitPlayers } = require('@util/util');


module.exports = class IslandCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'island',
			group: 'fun',
			memberName: 'island',
			description: 'Who will be the final two left on the island after a series of vote-kicks?',
			guildOnly: true,
			args: [
				{
					key: 'playersCount',
					label: 'players',
					prompt: 'How many players are you expecting to have?',
					type: 'integer',
					min: 3,
					max: 20
				}
			]
		});
	}

	async run(msg, { playersCount }) {
		try {
			const awaitedPlayers = await awaitPlayers(msg, playersCount, 3);
			if (!awaitedPlayers) {
				return msg.say('Game could not be started...');
			}
			let turn = 0;
			const players = new Collection();
			for (const player of awaitedPlayers) {
				players.set(player, {
					id: player,
					user: await this.client.users.fetch(player)
				});
			}
			let lastTurnTimeout = false;
			const playersLeft = new Set(players.map(p => p.id));
			while (playersLeft.size > 2) {
				++turn;
				await msg.say(stripIndents`
					**Day ${turn}.** Who should be kicked off the island?
					You have **2 minutes** to make a decision before voting starts.
				`);
				await delay(30000);
				const choices = players.filter(player => playersLeft.has(player.id));
				const ids = choices.map(player => player.id);
				await msg.say(stripIndents`
					Alright, who do you want to kick off the island? You have 1 minute to vote.
					_Type the number of the player you want to kick._
					${choices.map((player, i) => `**${i + 1}.** ${player.user.tag}`).join('\n')}
				`);
				const votes = new Collection();
				const voteFilter = res => {
					if (!playersLeft.has(res.author.id)) return false;
					const int = Number.parseInt(res.content, 10);
					if (int >= 1 && int <= playersLeft.size) {
						const currentVotes = votes.get(choices[int - 1]);
						votes.set(ids[int - 1], {
							votes: currentVotes ? currentVotes + 1 : 1,
							id: ids[int - 1]
						});
						res.react('✅').catch(() => null);
						return true;
					}
					return false;
				};
				const vote = await msg.channel.awaitMessages(voteFilter, {
					max: playersLeft.size,
					time: 30000
				});
				if (!vote.size) {
					if (lastTurnTimeout) {
						await msg.say('Game ended due to inactivity.');
						break;
					} else {
						await msg.say('Come on guys, get in the game!');
						lastTurnTimeout = true;
						continue;
					}
				}
				const kicked = players.get(votes.sort((a, b) => b.votes - a.votes).first().id);
				playersLeft.delete(kicked.id);
				await msg.say(stripIndents`
					**${kicked.user.tag}** will be kicked off the island.
					${playersLeft.size > 2 ? '_Next round starts in 30 seconds.' : ''}
				`);
				if (playersLeft.size > 2) await delay(30000);
				else break;
			}
			const winners = players.filter(player => playersLeft.has(player.id));
			return msg.say(`Congrats, ${winners.map(player => player.user.tag).join(' and ')}!`);
		} catch (err) {
			throw err;
		}
	}
};