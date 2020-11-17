const { Menu } = require('discord.js-menu');
const Discord = require(`discord.js`)
const client = new Discord.Client()

module.exports = {
  commands: [`help`, `h`, `commands`, `cmds`],
  description: "Describes all of this bot`s commands",
  async callback (message, arguments, text)  {
    
    
      // Provide a menu with a channel, an author ID to let control the menu, and an array of menu pages.
          let helpMenu = new Menu(message.channel, message.author.id, [
              // Each object in this array is a unique page.
              {
                name: 'system',
                content: new Discord.MessageEmbed({
                    title: 'System Config',
                    description: `This command shows Tubb's commands \n\n Use the reactions to navagate \n\n **prefix**, Set custom server prefix. \n **setwelcome (sw)**, Set your server's welcome message, use <@> to tag new members and use command in channel to send messages in. \n **setimage (si)**, Set custom welcome image. \n **textcolor (sc)**, Set custom welcome text color. \n **simjoin (sj)**, Stimulates someone joining your server to test out all of the above. \n`
                }),
                reactions: {
                    '▶': 'general',
                    '⏹': 'delete'
                }
            },
              {
                  // A page object consists of a name, used as a destination by reactions...
                  name: 'general',
                  // A MessageEmbed to actually send in chat, and...
                  content: new Discord.MessageEmbed({
                      title: 'General Commands',
                      description: '**sys**, Sysinfo.exe \n **help (h)**, Shows this menu \n **msgdel**, Message Genocide \n **ping**, Find your ping to me! \n **summon**, *Holy Music stops* \n '
                   
                      
                  }),
                  // A set of reactions with destination names attached.
                  // Note there's also special destination names (read below)
                  reactions: {
                    '◀': 'system',
                    '▶': 'fun'   
                  }
              },
              {
                name: 'fun',
                content: new Discord.MessageEmbed({
                    title: 'Fun Commands',
                    description: `**add**, Adds two numbers \n  **reddit (r)**, *Taste the memes* \n **news (n)**, Shows some news articles \n **weather (w)**, Shows the weather for your city \n **todayinhistory (tih)**, Finds an event that happened on specifiec date. \n **urbandictionary (ud)**, Looks up a word/phrase. \n`
                }),
                reactions: {
                    '◀': 'general',
                    '▶': 'moderation'
                }
            },
              {
                name: 'moderation',
                content: new Discord.MessageEmbed({
                    title: 'Moderation',
                    description: '**ban**, BAN HAMMER TIME!! \n  **kick**, Kicks someone somewhere? \n **mute**, Muhn mhuuthm mhee \n **unban**, Reinstatement to this Server! \n **unmute**, Oh I can talk now? \n **giverole (addrole)**, Gives someone a role \n **removerole (derole)**, Loss of Privileges'
                }),
                reactions: {
                    '◀': 'fun',
                    '▶': 'music'
                }
            },
            {
              name: 'music',
              content: new Discord.MessageEmbed({
                  title: 'Music 1/2',
                  description: '**createplaylist (cp)**, Creates a custom playlist \n **deleteplaylist (delp)**, Deletes a custom playlist \n **displayplaylist (dp)**, Displays a custom playlist`s songs \n **leave**, Leaves the Voice Channel \n **loop**, Toggle song loop \n **loopqueue (lq)**, Loops the entire queue \n **lyrics (ly)**, Get lyrics for the currently playing song \n **move**, Move songs anywhere in the queue \n **myplaylists (mp)**, Displays your custom playlist \n **nowplaying (np)**, Show now playing song \n **pause**, Pause the currently playing music \n'
              }),
              reactions: {
                  '◀': 'moderation',
                  '▶': 'music2'
              }
            },
            {
                name: 'music2',
                content: new Discord.MessageEmbed({
                    title: 'Music 2/2',
                    description: '**play (p)**, Plays audio from YouTube \n **queue (q)**, Show the music queue and now playing \n **remove**, Remove song from the queue \n **removefromplaylist (rfp)**, Removes a song from your custom playlist \n **resume**, Resumes currently playing music \n **savetoplaylist (stp)**, Saves songs to your custom playlist \n **shuffle**, Shuffle queue \n **skip (s)**, Skip the currently playing song \n **skipall (sa)**, Skips all the songs \n **skipto (st)**, Skip to the selected queue number \n **volume (v)**, Change volume of currently playing music'
                }),
                reactions: {
                    '◀': 'music',
                }
              },
              
              
              // The last parameter is the number of milliseconds you want the menu to collect reactions for each page before it stops to save resources
              // The timer is reset when a user interacts with the menu.
              // This is optional, and defaults to 180000 (3 minutes).
          ], 712000)
          // Run Menu.start() when you're ready to send the menu in chat.
          // Once sent, the menu will automatically handle everything else.
          helpMenu.start()
       
    
      } 
   }
 