var SpotifyWebApi = require('spotify-web-api-node');
const spotifyUri = require("spotify-uri");
const rp = require("request-promise-native");
const StreamConcat = require('stream-concat');
const moment = require("moment");
require("moment-duration-format")(moment);
const mm = require("music-metadata");
const youtube = new Youtube(process.env.YOUTUBE_API);
module.exports = class PlayCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'play',
      aliases: ['p'],
      memberName: 'play',
      group: 'music',
      description: 'Play any song or playlist from youtube!',
      guildOnly: true,
      clientPermissions: ['SPEAK', 'CONNECT'],
      throttling: {
        usages: 2,
        duration: 5
      },
      args: [
        {
          key: 'query',
          prompt: ':notes: What song or playlist would you like to listen to?',
          type: 'string',
          validate: function (query) {
            return query.length > 0 && query.length < 200;
          }
        }
      ]
    });
  }

  async run(message, { query }) {
    client.logger.info(`Command: ${this.name}, User: ${message.author.tag}`)
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      message.say(':no_entry: Please join a voice channel and try again!');
      return;
    }
    /*
     [
      { name: '1', urls: [ [Object], [Object] ] },
      { name: '2', urls: [ [Object], [Object], [Object] ] },
      { name: '3', urls: [ [Object], [Object] ] }
     ]
    */
    if (db.get(message.member.id) !== null) {
      const userPlaylists = db.get(message.member.id).savedPlaylists;
      let found = false;
      let location;
      for (let i = 0; i < userPlaylists.length; i++) {
        if (userPlaylists[i].name == query) {
          found = true;
          location = i;
          break;
        }
      }
      if (found) {
        const embed = new Discord.MessageEmbed()
          .setColor('#FFED00')
          .setTitle(':eyes: Clarification Please.')
          .setDescription(
            `You have a playlist named **${query}**, did you mean to play the playlist or search for **${query}** on YouTube?`
          )
          .addField(':arrow_forward: Playlist', '1. Play saved playlist')
          .addField(':mag: YouTube', '2. Search on YouTube')
          .addField(':x: Cancel', '3. Cancel')
          .setFooter('Choose by commenting a number between 1 and 3.');
        const clarifyEmbed = await message.say({ embed });
        message.channel
          .awaitMessages(
            function onMessage(msg) {
              return msg.content > 0 && msg.content < 4;
            },
            {
              max: 1,
              time: 30000,
              errors: ['time']
            }
          )
          .then(async function onClarifyResponse(response) {
            const msgContent = response.first().content;
            if (msgContent == 1) {
              if (clarifyEmbed) {
                clarifyEmbed.delete();
              }
              const urlsArray = userPlaylists[location].urls;
              if (urlsArray.length == 0) {
                message.reply(
                  `${query} is empty, add songs to it before attempting to play it`
                );
                return;
              }
              for (let i = 0; i < urlsArray.length; i++) {
                message.guild.musicData.queue.push(urlsArray[i]);
              }
              if (message.guild.musicData.isPlaying == true) {
                message.say(
                  `Playlist **${query} has been added to queue**`
                );
              } else if (message.guild.musicData.isPlaying == false) {
                message.guild.musicData.isPlaying = true;
                PlayCommand.playSong(message.guild.musicData.queue, message);
              }
            } else if (msgContent == 2) {
              await PlayCommand.searchYoutube(query, message, voiceChannel);
              return;
            } else if (msgContent == 3) {
              clarifyEmbed.delete();
              return;
            }
          })
          .catch(function onClarifyError() {
            if (clarifyEmbed) {
              clarifyEmbed.delete();
            }
            return;
          });
        return;
      }
    }

    if (
      // Handles PlayList Links
      query.match(
        /^(?!.*\?.*\bv=)https:\/\/www\.youtube\.com\/.*\?.*\blist=.*$/
      )
    ) {
      const playlist = await youtube.getPlaylist(query).catch(function () {
        message.say(':x: Playlist is either private or it does not exist!');
        return;
      });
      // add 10 as an argument in getVideos() if you choose to limit the queue
      const videosArr = await playlist.getVideos().catch(function () {
        message.say(
          ':x: There was a problem getting one of the videos in the playlist!'
        );
        return;
      });

      // Uncommented if you want to shuffle the playlist

      /*for (let i = videosArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [videosArr[i], videosArr[j]] = [videosArr[j], videosArr[i]];
      }
      */

      for (let i = 0; i < videosArr.length; i++) {
        if (videosArr[i].raw.status.privacyStatus == 'private') {
          continue;
        } else {
          try {
            const video = await videosArr[i].fetch();
            // this can be uncommented if you choose to limit the queue
            // if (message.guild.musicData.queue.length < 10) {
            //
            message.guild.musicData.queue.push(
              PlayCommand.constructSongObj(
                video,
                voiceChannel,
                message.member.user
              )
            );
            // } else {
            //   return message.say(
            //     `I can't play the full playlist because there will be more than 10 songs in queue`
            //   );
            // }
          } catch (err) {
            return console.error(err);
          }
        }
      }
      if (message.guild.musicData.isPlaying == false) {
        message.guild.musicData.isPlaying = true;
        return PlayCommand.playSong(message.guild.musicData.queue, message);
      } else if (message.guild.musicData.isPlaying == true) {
        const PlayListEmbed = new Discord.MessageEmbed()
          .setColor('#FFED00')
          .setTitle(`:musical_note: ${playlist.title}`)
          .addField(
            `Playlist has added ${message.guild.musicData.queue.length} songs to queue!`,
            playlist.url
          )
          .setThumbnail(playlist.thumbnails.high.url)
          .setURL(playlist.url);
        message.say(PlayListEmbed);
        // @TODO add the the position number of queue of the when a playlist is added
        return;
      }
    }

    // This if statement checks if the user entered a youtube url, it can be any kind of youtube url
    if (
      query.match(/^(http(s)?:\/\/)?(m.)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/)
    ) {
      query = query
        .replace(/(>|<)/gi, '')
        .split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
      const id = query[2].split(/[^0-9a-z_\-]/i)[0];
      const video = await youtube.getVideoByID(id).catch(function () {
        message.say(':x: There was a problem getting the video you provided!');
        return;
      });

      // // can be uncommented if you don't want the bot to play live streams
      // if (video.raw.snippet.liveBroadcastContent === 'live') {
      //   return message.say("I don't support live streams!");
      // }
      // // can be uncommented if you don't want the bot to play videos longer than 1 hour
      // if (video.duration.hours !== 0) {
      //   return message.say('I cannot play videos longer than 1 hour');
      // }
      // // can be uncommented if you want to limit the queue
      // if (message.guild.musicData.queue.length > 10) {
      //   return message.say(
      //     'There are too many songs in the queue already, skip or wait a bit'
      //   );
      // }
      message.guild.musicData.queue.push(
        PlayCommand.constructSongObj(video, voiceChannel, message.member.user)
      );
      if (
        message.guild.musicData.isPlaying == false ||
        typeof message.guild.musicData.isPlaying == 'undefined'
      ) {
        message.guild.musicData.isPlaying = true;
        return PlayCommand.playSong(message.guild.musicData.queue, message);
      } else if (message.guild.musicData.isPlaying == true) {
        const addedEmbed = new Discord.MessageEmbed()
          .setColor('#FFED00')
          .setTitle(`:musical_note: ${video.title}`)
          .addField(
            `Has been added to queue. `,
            `This song is #${message.guild.musicData.queue.length} in queue`
          )
          .setThumbnail(video.thumbnails.high.url)
          .setURL(video.url);
        message.say(addedEmbed);
        return;
      }
    }
    //Google Drive Links
    if (
      query.match('drive\.google\.com')
    ) {
      const formats = [/https:\/\/drive\.google\.com\/file\/d\/(?<id>.*?)\/(?:edit|view)\?usp=sharing/, /https:\/\/drive\.google\.com\/open\?id=(?<id>.*?)$/];
      const alphanumeric = /^[a-zA-Z0-9\-_]+$/;
      let id;
      formats.forEach((regex) => {
        const matches = query.match(regex)
        if (matches && matches.groups && matches.groups.id) id = matches.groups.id
      });
      if (!id) {
        if (alphanumeric.test(query)) id = query;
        else {
          message.say(`The link/keywords you provided is invalid! Usage: \`${message.guild.commandPrefix}${this.name} <link or search>\``);
          return { error: true };
        }
      }
      var link = "https://drive.google.com/uc?export=download&id=" + id;
      var stream = await fetch(link).then(res => res.body);
      var title = "No Title";
      try {
        var metadata = await mm.parseStream(stream, {}, { duration: true });
        var html = await rp(query);
        var $ = cheerio.load(html);
        title = $("title").text().split(" - ").slice(0, -1).join(" - ").split(".").slice(0, -1).join(".");
      } catch (err) {
        message.reply("there was an error trying to parse your link!");
        return { error: true };
      }
      if (!metadata) {
        message.say("An error occured while parsing the audio file into stream! Maybe it is not link to the file?");
        return { error: true };
      }
      var songLength = Math.round(metadata.format.duration);
      var video = {
        title: title,
        url: link,
        duration: songLength,
        thumbnail: "https://drive-thirdparty.googleusercontent.com/256/type/audio/mpeg",
      };
      message.guild.musicData.queue.push(
        PlayCommand.constructSongObj(video, voiceChannel, message.member.user)
      );
      if (
        message.guild.musicData.isPlaying == false ||
        typeof message.guild.musicData.isPlaying == 'undefined'
      ) {
        message.guild.musicData.isPlaying = true;
        return PlayCommand.playSong(message.guild.musicData.queue, message);
      } else if (message.guild.musicData.isPlaying == true) {
        const addedEmbed = new Discord.MessageEmbed()
          .setColor('#FFED00')
          .setTitle(`:musical_note: ${video.title}`)
          .addField(
            `Has been added to queue. `,
            `This song is #${message.guild.musicData.queue.length} in queue`
          )
          .setThumbnail(video.thumbnail)
          .setURL(video.url);
        message.say(addedEmbed);
        return;
      }
      return { error: false, songs: songs };
      // return message.say(`Google Drive not supported yet...`)
    }
    //Soundcloud Links
    if (
      query.match('soundcloud\.com')
    ) {
      //   const trackInfo = await scdl.getInfo(query, SOUNDCLOUD_CLIENT_ID);
      //   song = {
      //     title: trackInfo.title,
      //     url: url,
      //   };
      //   message.guild.musicData.queue.push(
      //     PlayCommand.constructSongObj(video, voiceChannel, message.member.user)
      //   );
      return message.say(`Soundcloud not supported yet...`)
    }
    //Spotify links
    if (
      query.includes('open.spotify\.com')
    ) {
      var spotifyApi = new SpotifyWebApi()
      spotifyApi.setCredentials({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      })
      // Retrieve an access token.

      const d = await spotifyApi.clientCredentialsGrant();
      spotifyApi.setAccessToken(d.body.access_token);
      spotifyApi.setRefreshToken(process.env.SPOTIFY_REFRESH);
      const refreshed = await spotifyApi.refreshAccessToken().catch(console.error);
      console.log("Refreshed Spotify Access Token");
      await spotifyApi.setAccessToken(refreshed.body.access_token);
      let songData;
      let songInfo;
      const spotifyTracks = [];
      try {
        songData = spotifyUri.parse(query);
      } catch (err) {
        console.log(err);
      }
      message.reply(`Fetching songs...`)
      if (songData.type === "track") {
        spotifyApi.getTrack(songData.id)
          .then(async (data) => {
            const track = data.body;
            const results = await youtube.searchVideos(
              `${track.name} ${track.artists[0].name}`
            );
            songInfo = await ytdl.getInfo(results[0].url);

            await spotifyTracks.push({
              url: songInfo.videoDetails.video_url,
            });
          })
          .catch((err) => console.log(err));
      } else if (songData.type === "album") {
        spotifyApi.getAlbum(songData.id).then((data) => {
          const album = data.body;
          const tracks = album.tracks.items;

          tracks.forEach(async (track) => {
            const results = await youtube.searchVideos(
              `${track.name} ${track.artists[0].name}`
            );
            songInfo = await ytdl.getInfo(results[0].url);

            await spotifyTracks.push({
              url: songInfo.videoDetails.video_url,
            });
          });
        });
      } else if (songData.type === "playlist") {
        spotifyApi.getPlaylistTracks(songData.id).then((data) => {
          const playlist = data.body;

          playlist.items.forEach(async (item) => {
            const results = await youtube.searchVideos(
              `${item.track.name} ${item.track.artists[0].name}`
            );
            songInfo = await ytdl.getInfo(results[0].url);

            await spotifyTracks.push({
              url: songInfo.videoDetails.video_url,
            });
          });
        })
      }
      setTimeout(async () => {
        spotifyTracks.forEach(async (track) => {
          const id = PlayCommand.matchYoutubeUrl(track.url)
          const video = await youtube.getVideoByID(id).catch(function () {
            message.say(':x: There was a problem getting the video you provided!');
            return;
          });
          message.guild.musicData.queue.push(
            PlayCommand.constructSongObj(video, voiceChannel, message.member.user)
          );
          if (
            message.guild.musicData.isPlaying == false ||
            typeof message.guild.musicData.isPlaying == 'undefined'
          ) {
            message.guild.musicData.isPlaying = true;
            return PlayCommand.playSong(message.guild.musicData.queue, message);
          } else if (message.guild.musicData.isPlaying == true) {
            const addedEmbed = new Discord.MessageEmbed()
              .setColor('#FFED00')
              .setTitle(`:musical_note: ${video.title}`)
              .addField(
                `Has been added to queue. `,
                `This song is #${message.guild.musicData.queue.length} in queue`
              )
              .setThumbnail(video.thumbnails.high.url)
              .setURL(video.url);
            message.say(addedEmbed);
            return;
          }
        });
      }, 6000);
      return
    }

    // if user provided a song/video name
    await PlayCommand.searchYoutube(query, message, voiceChannel);
  }
  static matchYoutubeUrl(url) {
    var p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    return (url.match(p)) ? RegExp.$1 : false;
  }
  static async playSong(queue, message) {
    const classThis = this; // use classThis instead of 'this' because of lexical scope below
    if (queue[0].voiceChannel == undefined) {
      // happens when loading a saved playlist
      queue[0].voiceChannel = message.member.voice.channel;
    }
    if (message.guild.me.voice.channel !== null) {
      if (message.guild.me.voice.channel.id !== queue[0].voiceChannel.id) {
        queue[0].voiceChannel = message.guild.me.voice.channel;
      }
    }
    const a = await requestStream(queue[0].url);
    queue[0].voiceChannel
      .join()
      .then(function (connection) {
        const dispatcher = connection
          .play(
            ytdl(queue[0].url, {
              filter: 'audio',
              quality: 'highestaudio',
              highWaterMark: 1 << 25
            })
            || new StreamConcat(a, { highWaterMark: 1 << 25 }), { seek: seek })
          .on('start', function () {
            message.guild.musicData.songDispatcher = dispatcher;
            if (!db.get(`${message.guild.id}.serverSettings.volume`))
              dispatcher.setVolume(message.guild.musicData.volume);
            else
              dispatcher.setVolume(
                db.get(`${message.guild.id}.serverSettings.volume`)
              );

            const videoEmbed = new Discord.MessageEmbed()
              .setThumbnail(queue[0].thumbnail)
              .setColor('#FFED00')
              .addField(':notes: Now Playing:', queue[0].title)
              .addField(':stopwatch: Duration:', queue[0].duration)
              .setURL(queue[0].url)
              .setFooter(
                `Requested by ${queue[0].memberDisplayName}!`,
                queue[0].memberAvatar
              );

            if (queue[1] && !message.guild.musicData.loopSong)
              videoEmbed.addField(':track_next: Next Song:', queue[1].title);
            message.say(videoEmbed);
            message.guild.musicData.nowPlaying = queue[0];
            queue.shift();
            return;
          })
          .on('finish', function () {
            queue = message.guild.musicData.queue;
            if (message.guild.musicData.loopSong) {
              queue.unshift(message.guild.musicData.nowPlaying);
            } else if (message.guild.musicData.loopQueue) {
              queue.push(message.guild.musicData.nowPlaying);
            }
            if (queue.length >= 1) {
              classThis.playSong(queue, message);
              return;
            } else {
              message.guild.musicData.isPlaying = false;
              message.guild.musicData.nowPlaying = null;
              message.guild.musicData.songDispatcher = null;
              if (
                message.guild.me.voice.channel &&
                message.guild.musicData.skipTimer
              ) {
                message.guild.me.voice.channel.leave();
                message.guild.musicData.skipTimer = false;
                return;
              }
              if (message.guild.me.voice.channel) {
                setTimeout(function onTimeOut() {
                  if (
                    message.guild.musicData.isPlaying == false &&
                    message.guild.me.voice.channel
                  ) {
                    message.guild.me.voice.channel.leave();
                    message.say(
                      ':zzz: Left channel due to inactivity.'
                    );
                  }
                }, 90000);
              }
            }
          })
          .on('error', function (e) {
            message.say(':x: Cannot play song!');
            console.error(e);
            if (queue.length > 1) {
              queue.shift();
              classThis.playSong(queue, message);
              return;
            }
            message.guild.musicData.queue.length = 0;
            message.guild.musicData.isPlaying = false;
            message.guild.musicData.nowPlaying = null;
            message.guild.musicData.loopSong = false;
            message.guild.musicData.songDispatcher = null;
            message.guild.me.voice.channel.leave();
            return;
          });
      })
      .catch(function () {
        message.say(':no_entry: I have no permission to join your channel!');
        message.guild.musicData.queue.length = 0;
        message.guild.musicData.isPlaying = false;
        message.guild.musicData.nowPlaying = null;
        message.guild.musicData.loopSong = false;
        message.guild.musicData.songDispatcher = null;
        if (message.guild.me.voice.channel) {
          message.guild.me.voice.channel.leave();
        }
        return;
      });
  }

  static async searchYoutube(query, message, voiceChannel) {
    const videos = await youtube.searchVideos(query, 5).catch(async function () {
      await message.say(
        ':x: There was a problem searching the video you requested!'
      );
      return;
    });
    if (videos.length < 5 || !videos) {
      message.say(
        `:x: I had some trouble finding what you were looking for, please try again or be more specific.`
      );
      return;
    }
    const vidNameArr = [];
    for (let i = 0; i < videos.length; i++) {
      vidNameArr.push(
        `${i + 1}: [${videos[i].title
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&apos;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")}](${videos[i].shortURL})`
      );
    }
    vidNameArr.push('cancel');
    const embed = new Discord.MessageEmbed()
      .setColor('#FFED00')
      .setTitle(`:mag: Search Results!`)
      .addField(':notes: Result 1', vidNameArr[0])
      .setURL(videos[0].url)
      .addField(':notes: Result 2', vidNameArr[1])
      .addField(':notes: Result 3', vidNameArr[2])
      .addField(':notes: Result 4', vidNameArr[3])
      .addField(':notes: Result 5', vidNameArr[4])
      .setThumbnail(videos[0].thumbnails.high.url)
      .setFooter('Choose a song by commenting a number between 1 and 5')
      .addField(':x: Cancel', 'to cancel ');
    var songEmbed = await message.say({ embed });
    message.channel
      .awaitMessages(
        function (msg) {
          return (
            (msg.content > 0 && msg.content < 6) || msg.content === 'cancel'
          );
        },
        {
          max: 1,
          time: 60000,
          errors: ['time']
        }
      )
      .then(function (response) {
        const videoIndex = parseInt(response.first().content);
        if (response.first().content === 'cancel') {
          songEmbed.delete();
          return;
        }
        youtube
          .getVideoByID(videos[videoIndex - 1].id)
          .then(function (video) {
            // // can be uncommented if you don't want the bot to play live streams
            // if (video.raw.snippet.liveBroadcastContent === 'live') {
            //   songEmbed.delete();
            //   return message.say("I don't support live streams!");
            // }

            // // can be uncommented if you don't want the bot to play videos longer than 1 hour
            // if (video.duration.hours !== 0) {
            //   songEmbed.delete();
            //   return message.say('I cannot play videos longer than 1 hour');
            // }

            // // can be uncommented if you don't want to limit the queue
            // if (message.guild.musicData.queue.length > 10) {
            //   songEmbed.delete();
            //   return message.say(
            //     'There are too many songs in the queue already, skip or wait a bit'
            //   );
            // }
            message.guild.musicData.queue.push(
              PlayCommand.constructSongObj(
                video,
                voiceChannel,
                message.member.user
              )
            );
            if (message.guild.musicData.isPlaying == false) {
              message.guild.musicData.isPlaying = true;
              if (songEmbed) {
                songEmbed.delete();
              }
              PlayCommand.playSong(message.guild.musicData.queue, message);
            } else if (message.guild.musicData.isPlaying == true) {
              if (songEmbed) {
                songEmbed.delete();
              }
              const addedEmbed = new Discord.MessageEmbed()
                .setColor('#FFED00')
                .setTitle(`:musical_note: ${video.title}`)
                .addField(
                  `Has been added to queue. `,
                  `This song is #${message.guild.musicData.queue.length} in queue`
                )
                .setThumbnail(video.thumbnails.high.url)
                .setURL(video.url);
              message.say(addedEmbed);
              return;
            }
          })
          .catch(function () {
            if (songEmbed) {
              songEmbed.delete();
            }
            message.say(
              ':x: An error has occured when trying to get the video ID from youtube.'
            );
            return;
          });
      })
      .catch(function () {
        if (songEmbed) {
          songEmbed.delete();
        }
        message.say(
          ':x: Please try again and enter a number between 1 and 5 or cancel.'
        );
        return;
      });
  }

  static constructSongObj(video, voiceChannel, user) {
    let duration = this.formatDuration(video.duration);
    if (duration == '00:00') duration = ':red_circle: Live Stream';
    return {
      url: `https://www.youtube.com/watch?v=${video.raw.id}` || video.url,
      title: video.title,
      rawDuration: video.duration,
      duration,
      thumbnail: video.thumbnails.high.url || video.thumbnail,
      voiceChannel,
      memberDisplayName: user.username,
      memberAvatar: user.avatarURL('webp', false, 16)
    };
  }
  // prettier-ignore
  static formatDuration(durationObj) {
    const duration = `${durationObj.hours ? (durationObj.hours + ':') : ''}${durationObj.minutes ? durationObj.minutes : '00'
      }:${(durationObj.seconds < 10)
        ? ('0' + durationObj.seconds)
        : (durationObj.seconds
          ? durationObj.seconds
          : '00')
      }`;
    return duration;
  }
};