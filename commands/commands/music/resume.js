const { canModifyQueue } = require("@util/musicutil");

module.exports = {
  name: "resume",
  commands: ["resume", "r"],
  description: "Resume currently playing music",
  callback:(message) => {
    const queue = message.client.queue.get(message.guild.id);
    if (!queue) return message.reply("There is nothing playing.").catch(console.error);
    if (!canModifyQueue(message.member)) return;

    if (!queue.playing) {
      queue.playing = true;
      queue.connection.dispatcher.resume();
      return queue.textChannel.send(`${message.author} ▶ resumed the music!`).catch(console.error);
    }

    return message.reply("The queue is not paused.").catch(console.error);
  }
};