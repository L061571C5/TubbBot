const { stripIndents } = require('common-tags');
const { FieldsEmbed } = require('discord-paginationembed')
const { util: { permissions } } = require('discord.js-commando');
module.exports = class Help2Command extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'help2',
            aliases: [`h2`, `commands2`, `cmds2`],
            group: 'utility',
            memberName: 'help2',
            description: 'Describes all of this bot`s commands2',
            args: [
                {
                    key: 'command',
                    prompt: 'Which command would you like to view the help for?',
                    type: 'command',
                    default: ''
                }
            ]
        });
    }
    async run(message, { command }) {
        if (!command) {
            const embeds = [];
            for (let i = 0; i < Math.ceil(this.client.registry.groups.size / 10); i++) {
                const nsfw = message.channel.nsfw || this.client.isOwner(message.author);
                const embed = new Discord.MessageEmbed()
                    .setTitle(`Command List (Page ${i + 1})`)
                    .setDescription(stripIndents`
						To run a command, use ${message.anyUsage('<command>')}.
						${nsfw ? '' : 'Use in an NSFW channel to see NSFW commands.'}
					`)
                    .setColor(0x00AE86);
                embeds.push(embed);
            }
            let cmdCount = 0;
            let i = 0;
            let embedIndex = 0;
            for (const group of this.client.registry.groups.values()) {
                i++;
                const owner = this.client.isOwner(message.author);
                const commands = group.commands.filter(cmd => {
                    if (owner) return true;
                    if (cmd.ownerOnly || cmd.hidden) return false;
                    if (cmd.nsfw && !message.channel.nsfw) return false;
                    return true;
                });
                if (!commands.size) continue;
                cmdCount += commands.size;
                if (i > (embedIndex * 10) + 10) embedIndex++;
                embeds[embedIndex].addField(`❯ ${group.name}`, commands.map(cmd => `\`${cmd.name}\``).join(' '));
            }
            const allShown = cmdCount === this.client.registry.commands.size;
            embeds[embeds.length - 1]
                .setFooter(`${this.client.registry.commands.size} Commands${allShown ? '' : ` (${cmdCount} Shown)`}`);
            try {
                const messages = [];
                for (const embed of embeds) messages.push(await message.direct({ embed }));
                if (message.channel.type !== 'dm') messages.push(await message.say('📬 Sent you a DM with information.'));
                return messages;
            } catch {
                return message.reply('Failed to send DM. You probably have DMs disabled.');
            }
        }
        const userPerms = command.userPermissions
            ? command.userPermissions.map(perm => permissions[perm]).join(', ')
            : 'None';
        const clientPerms = command.clientPermissions
            ? command.clientPermissions.map(perm => permissions[perm]).join(', ')
            : 'None';
        return message.say(stripIndents`
			__Command **${command.name}**__${command.guildOnly ? ' (Usable only in servers)' : ''}
			${command.description}${command.details ? `\n${command.details}` : ''}
			**Format:** ${command.usage(command.format || '')}
			**Aliases:** ${command.aliases.join(', ') || 'None'}
			**Group:** ${command.group.name} (\`${command.groupID}:${command.memberName}\`)
			**NSFW:** ${command.nsfw ? 'Yes' : 'No'}
			**Permissions You Need:** ${userPerms}
			**Permissions I Need:** ${clientPerms}
		`);
    }
};