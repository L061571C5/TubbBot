
module.exports = class DeletePlaylistCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'delete-playlist',
      group: 'music',
      aliases: ['delp'],
      memberName: 'delete-playlist',
      guildOnly: true,
      description: 'Delete a playlist from your saved playlists',
      args: [
        {
          key: 'playlistName',
          prompt: 'Which playlist would you like to delete?',
          type: 'string'
        }
      ]
    });
  }

  run(message, { playlistName }) {

    client.logger.info(`Command: ${this.name}, User: ${message.author.tag}`)
    // check if user has playlists or user is in the db
    const dbUserFetch = db.get(message.member.id);
    if (!dbUserFetch) {
      message.reply('You have zero saved playlists!');
      return;
    }
    const savedPlaylistsClone = dbUserFetch.savedPlaylists;
    if (savedPlaylistsClone.length == 0) {
      message.reply('You have zero saved playlists!');
      return;
    }

    let found = false;
    let location;
    for (let i = 0; i < savedPlaylistsClone.length; i++) {
      if (savedPlaylistsClone[i].name == playlistName) {
        found = true;
        location = i;
        break;
      }
    }
    if (found) {
      savedPlaylistsClone.splice(location, 1);
      db.set(message.member.id, { savedPlaylists: savedPlaylistsClone });
      message.reply(`I removed **${playlistName}** from your saved playlists!`);
    } else {
      message.reply(`You have no playlist named ${playlistName}`);
    }
  }
};