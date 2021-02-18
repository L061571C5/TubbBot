let RedditAPI = require("reddit-wrapper-v2");
const Discord = require("discord.js");
const { validImgurURL } = require("../../function.js")
let redditConn = new RedditAPI({
    // Options for Reddit Wrapper
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
    app_id: process.env.REDDIT_ID,
    api_secret: process.env.REDDIT_SECRET,
    user_agent: "Reddit-Watcher-V2",
    retry_on_wait: true,
    retry_on_server_error: 5,
    retry_delay: 1
});
module.exports = {
    name: 'reddit',
    description: 'Fetches a meme from a subreddit',
    subcommands: ['hot', 'top', 'new'],
    aliases: ['meme'],
    async execute(message, arg) {
        arg = arg.split(" ")
        let subreddits = ["memes", "dankmemes", "meme"];
        let chosen = arg[0] || subreddits[Math.floor(Math.random() * subreddits.length)];
        let response = await redditConn.api.get(`/r/${chosen}/${arg[1] || `top`}`, { limit: 100 }).catch(console.error);
        //console.log(response)
        if (!response) return await execute(message, arg);
        if (response[1] === undefined) return await execute(message, arg);
        if (response[1].data === undefined || response[1].data.children[0] === undefined || response[1].data.children[0].data === undefined || response[1].data.children[0].data.url === undefined) return await execute(message, arg);
        let data = response[1].data.children[Math.floor(Math.random() * response[1].data.children.length)].data;
        if (!data || data.url === undefined || (!data.url.endsWith(".jpg") && !data.url.endsWith(".png") && !data.url.endsWith(".gif") && !validImgurURL(data.url))) return await execute(message, arg);

        const em = new Discord.MessageEmbed()
            .setTitle(`${data.title.substring(0, 256)}`)
            .setURL(`https://reddit.com${data.permalink}`)
            .setImage(data.url)
            .setColor('#FF5700')
            .setFooter(
                `${data.ups} 👍 | ${data.downs} 👎 | ${data.num_comments} 🗨`
            )
            .setTimestamp();
        message.channel.send(em);
    }
};