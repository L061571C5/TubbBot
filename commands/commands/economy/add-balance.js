const economy = require('@features/economy')

module.exports = {
  commands: ['addbalance', 'addbal'],
  minArgs: 2,
  maxArgs: 2,
  expectedArgs: "<The target's @> <Strand amount>",
  permissionError: 'You must be an administrator to use this command.',
  permissions: 'ADMINISTRATOR',
  callback: async (message, arguments) => {
    const mention = message.mentions.users.first() 
    
    if (!mention) {
      
      const balusrEmbed = new Discord.MessageEmbed()
            .setColor('#FFFF00')
            .setTitle(`Error`)
            .setDescription('Please tag a user to add Strands to.')

      
      message.reply(balusrEmbed)
      return
    }

    const strands = arguments[1]
    if (isNaN(strands)) {
      
      const balsadEmbed = new Discord.MessageEmbed()
            .setColor('#FFFF00')
            .setTitle(`Error`)
            .setDescription('Please provide a valid number of Strands.')
      
      message.reply(balsadEmbed)
      return
    }

    const guildId = message.guild.id
    const userId = mention.id

    const newCoins = await economy.addCoins(guildId, userId, strands)

    const balyesEmbed = new Discord.MessageEmbed()
    .setColor('#228B22')
    .setTitle(`Success`)
    .setDescription(`You have given <@${userId}> ${strands} Strand(s). They now have ${newCoins} Strand(s)!`)

    
    message.reply(balyesEmbed)
  },
}