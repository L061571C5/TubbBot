const Discord = require('discord.js')
const client = new Discord.Client()


module.exports = {
  commands: ['add', 'addition'],
  description: 'Add two numbers',
  callback: (message, args, text) => {
    
      let sum = 0
       for (const arg of args) {
        sum += parseInt(arg)
      }
  
      
    
    const addEmbed = new Discord.MessageEmbed()
    .setColor('#228B22')
    .setTitle(`Success`)
    .setDescription(`The sum is ${sum}`)
    message.reply(addEmbed)
  }
}