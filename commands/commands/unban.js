const Discord = require('discord.js')
const client = new Discord.Client()

module.exports = {
    commands: 'unban',
    permissionError: 'You must be an administrator to use this command.',
    permissions: 'ADMINISTRATOR',
    callback: (message) => {
        const { member, mentions, arguments} = message

        const tag = `<@${member.id}>`
        
        const target = mentions.users.first()
      if (target) {
        const targetMember = message.guild.members.cache.get(target.id)
        targetMember.unban()

        const unbyesEmbed = new Discord.MessageEmbed()
    .setColor('#228B22')
    .setTitle(`Success`)
    .setDescription(`${tag} That user has been unbanned`)


        message.channel.send(unbyesEmbed)
      } else {
        
        const unberrEmbed = new Discord.MessageEmbed()
            .setColor('#FFFF00')
            .setTitle(`Error`)
            .setDescription(`${tag} Please specify someone to unban.`)
        
        message.channel.send(unberrEmbed)
      }
    }
}