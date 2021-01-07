const Discord = require("discord.js");
const queue = new Discord.Collection();

module.exports = {
    name: "main",
    async run(message, commandName) {
        if (!message.guild) return await message.channel.send("You can only use music commands in server!");
        const command = console.commands.get(commandName) || console.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        const serverQueue = queue.get(message.guild.id);
        try {
            await command.music(message, serverQueue);
        } catch (error) {
            console.error(error);
            await message.reply("there was an error trying to execute that command!");
        }
    },
    getQueues() { return queue; },
    async updateQueue(message, serverQueue) {
        if (!serverQueue) queue.delete(message.guild.id);
        else queue.set(message.guild.id, serverQueue);
    },
    stop(guild) {
        const serverQueue = queue.get(guild.id);
        if (!serverQueue) return;
        if (serverQueue.connection && serverQueue.connection.dispatcher)
            serverQueue.connection.dispatcher.destroy();
        serverQueue.playing = false;
        serverQueue.connection = null;
        serverQueue.voiceChannel = null;
        serverQueue.textChannel = null;
        if (guild.me.voice.channel)
            guild.me.voice.channel.leave();
    },
    setQueue(guild, songs, loopStatus, repeatStatus) {
        const queueContruct = {
            textChannel: null,
            voiceChannel: null,
            connection: null,
            songs: songs,
            volume: 1,
            playing: false,
            paused: false,
            looping: loopStatus,
            repeating: repeatStatus,
            random: false,
        };
        queue.set(guild, queueContruct);
        return queueContruct;
    },
    checkQueue() {
        return queue.size > 0;
    }
}