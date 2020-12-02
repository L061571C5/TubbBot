const serverSchema = require('@schemas/server-schema')
const mongo = require('@util/mongo')
const config = require('@root/config.json');

module.exports = {
    commands: ['setcolor', 'sc'],
    permissionError: 'You must be an admin to run this command.',
    requiredPermissions: 'ADMINISTRATOR',
  callback: async (message) => {
    const webhookClient = new Discord.WebhookClient(config.webhookID, config.webhookToken);
        webhookClient.send(`Command: setcolor 
Ran by: ${message.author.tag}
Server: ${message.guild.name}
Date: ${new Date()}`)
    const { guild, channel, content } = message
    const cache = {}
    let color = content

    const split = color.split(' ')
 try {
    if (split.length < 2) {
      channel.send('Please provide a hex color')
      return
    }
     
  
    split.shift()
    color = split.join(' ')
    cache[guild.id] = [color]
    
        
    
    
  
    await serverSchema.findOneAndUpdate(
      {
        _id: guild.id,
      },
      {
        _id: guild.id,
        color,
      },
      {
        upsert: true,
      }
    )
    const webhookClient = new Discord.WebhookClient(config.webhookID, config.webhookToken);
        webhookClient.send('UPDATED IMAGE DATABASE')
       
    

    message.reply('Server color set! Please make sure that it is a hex code.')
  } catch (error) {
    console.error(error);
    return message.reply(error.message).catch(console.error);
  }
}
} 
