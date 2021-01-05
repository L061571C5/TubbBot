
const rp = require("request-promise-native");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const Discord = require("discord.js");
const { validMSURL, findValueByPrefix, streamToString } = require("@util/function.js");
const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const PNGtoPDF = (doc, url) => new Promise(async (resolve, reject) => {
    const rs = require("request-stream");
    rs.get(url, {}, (err, res) => {
        if (err) return reject(err);
        const chunks = [];
        res.on("data", chunk => chunks.push(chunk));
        res.on("end", () => {
            try {
                doc.image(Buffer.concat(chunks), 0, 0, { width: doc.page.width, height: doc.page.height });
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
});
const requestStream = (url) => new Promise((resolve, reject) => {
    const rs = require("request-stream");
    rs.get(url, {}, (err, res) => err ? reject(err) : resolve(res));
});
module.exports = class MusescoreCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'musescore',
            aliases: ['muse'],
            group: 'util',
            memberName: 'musescore',
            description: 'Get information of a MuseScore link, or search the site.',
            args: [
                {
                    key: 'arg',
                    prompt: 'What link or keywords do you want to search for?',
                    type: 'string',
                }
            ],
        });
    }
    async run(message, { arg }) {
        const cmdname = this.name;
        if (!validMSURL(arg)) return await MusescoreCommand.search(message, arg, cmdname);
        var message = await message.channel.send("Loading score...");
        message.channel.startTyping();
        try {
            const response = await rp({ uri: arg, resolveWithFullResponse: true });
            if (Math.floor(response.statusCode / 100) !== 2) return message.channel.send(`Received HTTP status code ${response.statusCode} when fetching data.`);
            var data = MusescoreCommand.parseBody(response.body);
        } catch (err) {
            console.realError(err);
            return message.reply("there was an error trying to fetch data of the score!");
        }
        const em = new Discord.MessageEmbed()
            .setColor('#000000')
            .setTitle(data.title)
            .setURL(data.url)
            .setThumbnail(data.thumbnail)
            .setDescription(`Description: **${data.description}**\n\nClick 🎵 to download MP3\nClick 📰 to download PDF\nClick 📥 to download both`)
            .addField("ID", data.id, true)
            .addField("Author", data.user.name, true)
            .addField("Duration", data.duration, true)
            .addField("Page Count", data.pageCount, true)
            .addField("Date Created", new Date(data.created * 1000).toLocaleString(), true)
            .addField("Date Updated", new Date(data.updated * 1000).toLocaleString(), true)
            .addField(`Tags [${data.tags.length}]`, data.tags.length > 0 ? data.tags.join(", ") : "None")
            .addField(`Parts [${data.parts.length}]`, data.parts.length > 0 ? data.parts.join(", ") : "None")
            .setTimestamp()
            .setFooter("Have a nice day! :)");
        message = await message.edit({ content: "", embed: em });
        message.channel.stopTyping(true);
        await message.react("🎵");
        await message.react("📰");
        await message.react("📥");
        const collected = await message.awaitReactions((r, u) => ["📥", "🎵", "📰"].includes(r.emoji.name) && u.id !== message.author.id, { max: 1, idle: 30000, errors: ["time"] });
        message.reactions.removeAll().catch(() => { });
        if (collected && collected.first()) {
            try {
                var mesg = await message.say("Generating files... (This will take a while. It depends on the length of the score.)");
                if (collected.first().emoji.name === "📥") {
                    const { doc, hasPDF } = await MusescoreCommand.getPDF(arg, data);
                    const mp3 = await MusescoreCommand.getMP3(arg);
                    console.log(mp3)
                    try {
                        const attachments = [];
                        if (!mp3.error) try {
                            const res = await requestStream(mp3.url).catch(console.log(`teee`));
                            if (!res) console.error("Failed to get Readable Stream");
                            else if (res.statusCode != 200) console.error("Received HTTP Status Code: " + res.statusCode);
                            else attachments.push(new Discord.MessageAttachment(res, `${data.title}.mp3`));
                        } catch (err) { }
                        if (hasPDF) attachments.push(new Discord.MessageAttachment(doc, `${data.title}.pdf`));
                        if (attachments.length < 1) return await mesg.edit("Failed to generate files!");
                        await mesg.delete();
                        message.channel.send(attachments);
                    } catch (err) {
                        await message.reply("did you block me? I cannot DM you!");
                    }
                } else if (collected.first().emoji.name === "🎵") {
                    const mp3 = await MusescoreCommand.getMP3(arg);
                    try {
                        const attachments = [];
                        if (!mp3.error) try {
                            const res = await requestStream(mp3.url).catch(console.error);
                            if (!res) console.error("Failed to get Readable Stream");
                            else if (res.statusCode != 200) console.error("Received HTTP Status Code: " + res.statusCode);
                            else attachments.push(new Discord.MessageAttachment(res, `${data.title}.mp3`));
                        } catch (err) { }
                        if (attachments.length < 1) return await mesg.edit("Failed to generate files!");
                        await mesg.delete();
                        await message.say(attachments);
                    } catch (err) {
                        await message.reply("did you block me? I cannot DM you!");
                    }
                } else {
                    const { doc, hasPDF } = await MusescoreCommand.getPDF(arg, data);
                    try {
                        const attachments = [];
                        if (hasPDF) attachments.push(new Discord.MessageAttachment(doc, `${data.title}.pdf`));
                        if (attachments.length < 1) return await mesg.edit("Failed to generate files!");
                        await mesg.delete();
                        await message.say(attachments);
                    } catch (err) {
                        await message.reply("did you block me? I cannot DM you!");
                    }
                }
            } catch (err) {
                console.error(err);
                await message.channel.send("Failed to generate files!");
            }
        }
    }
    static parseBody(body) {
        const $ = cheerio.load(body);
        const meta = $('meta[property="og:image"]')[0];
        const image = meta.attribs.content;
        const firstPage = image.split("@")[0];
        const stores = Array.from($('div[class^="js-"]'));
        const found = stores.find(x => x.attribs && x.attribs.class && x.attribs.class.match(/^js-\w+$/) && findValueByPrefix(x.attribs, "data-"));
        const store = findValueByPrefix(found.attribs, "data-");
        const data = JSON.parse(store).store.page.data;
        const id = data.score.id;
        const title = data.score.title;
        const thumbnail = data.score.thumbnails.large;
        const parts = data.score.parts_names;
        const url = data.score.share.publicUrl;
        const user = data.score.user;
        const duration = data.score.duration;
        const pageCount = data.score.pages_count;
        const created = data.score.date_created;
        const updated = data.score.date_updated;
        const description = data.score.truncated_description;
        const tags = data.score.tags;
        return { id, title, thumbnail, parts, url, user, duration, pageCount, created, updated, description, tags, firstPage };
    }
    static async search(message, arg, cmdname) {
        try {
            var response = await rp({ uri: `https://musescore.com/sheetmusic?text=${encodeURIComponent(arg)}`, resolveWithFullResponse: true });
            if (Math.floor(response.statusCode / 100) !== 2) return message.channel.send(`Received HTTP status code ${response.statusCode} when fetching data.`);
            var body = response.body;
        } catch (err) {
            return message.reply("there was an error trying to search for scores!");
        }
        var message = await message.channel.send("Loading scores...");
        message.channel.startTyping();
        var $ = cheerio.load(body);
        const stores = Array.from($('div[class^="js-"]'));
        const store = findValueByPrefix(stores.find(x => x.attribs && x.attribs.class && x.attribs.class.match(/^js-\w+$/)).attribs, "data-");
        var data = JSON.parse(store);
        const allEmbeds = [];
        const importants = [];
        var num = 0;
        var scores = data.store.page.data.scores;
        for (const score of scores) {
            try {
                var response = await rp({ uri: score.share.publicUrl, resolveWithFullResponse: true });
                if (Math.floor(response.statusCode / 100) !== 2) return message.channel.send(`Received HTTP status code ${response.statusCode} when fetching data.`);
                body = response.body;
            } catch (err) {
                await message.delete();
                return message.reply("there was an error trying to fetch data of the score!");
            }
            data = MusescoreCommand.parseBody(body);
            const em = new Discord.MessageEmbed()
                .setColor('#000000')
                .setTitle(data.title)
                .setURL(data.url)
                .setThumbnail(data.thumbnail)
                .setDescription(`Description: **${data.description}**\n\nTo download, please copy the URL and use \`${message.guild.commandPrefix}${cmdname} <link>\``)
                .addField("ID", data.id, true)
                .addField("Author", data.user.name, true)
                .addField("Duration", data.duration, true)
                .addField("Page Count", data.pageCount, true)
                .addField("Date Created", new Date(data.created * 1000).toLocaleString(), true)
                .addField("Date Updated", new Date(data.updated * 1000).toLocaleString(), true)
                .addField(`Tags [${data.tags.length}]`, data.tags.length > 0 ? data.tags.join(", ") : "None")
                .addField(`Parts [${data.parts.length}]`, data.parts.length > 0 ? data.parts.join(", ") : "None")
                .setTimestamp()
                .setFooter(`Currently on page ${++num}/${scores.length}`, message.client.user.displayAvatarURL());
            allEmbeds.push(em);
            importants.push({ important: data.important, pages: data.pageCount, url: score.share.publicUrl, title: data.title, id: data.id });
        }
        if (allEmbeds.length < 1) return message.channel.send("No score was found!");
        var s = 0;
        message.channel.stopTyping(true);
        await message.delete();
        message = await message.channel.send(allEmbeds[0]);
        await message.react("⏮");
        await message.react("◀");
        await message.react("▶");
        await message.react("⏭");
        await message.react("⏹");
        const filter = (reaction, user) => user.id !== message.author.id
        var collector = message.createReactionCollector(
            filter,
            { idle: 60000, errors: ["time"] }
        );

        collector.on("collect", (reaction, user) => {
            //reaction.users.remove(user.id);
            switch (reaction.emoji.name) {
                case "⏮":
                    reaction.users.remove(user).catch(console.error);
                    s = 0;
                    message.edit(allEmbeds[s]);
                    break;
                case "◀":
                    reaction.users.remove(user).catch(console.error);
                    s -= 1;
                    if (s < 0) s = allEmbeds.length - 1;
                    message.edit(allEmbeds[s]);
                    break;
                case "▶":
                    reaction.users.remove(user).catch(console.error);
                    s += 1;
                    if (s > allEmbeds.length - 1) s = 0;
                    message.edit(allEmbeds[s]);
                    break;
                case "⏭":
                    reaction.users.remove(user).catch(console.error);
                    s = allEmbeds.length - 1;
                    message.edit(allEmbeds[s]);
                    break;
                case "⏹":
                    collector.emit("end");
                    break;
            }
        });
        collector.on("end", function () {
            message.reactions.removeAll().catch(() => { });
        });
    }
    static async getMP3(url) { await (Object.getPrototypeOf(async function () { }).constructor())(url) }
    static async getPDF(url, data) {
        if (!data) {
            const res = await rp({ uri: url, resolveWithFullResponse: true });
            data = MusescoreCommand.parseBody(res.body);
        }
        var result = { error: true };
        var score = data.firstPage.slice(0, -3) + "svg";
        var fetched = await fetch(score);
        if (!fetched.ok) {
            score = score.slice(0, -3) + "png";
            var fetched = await fetch(score);
            if (!fetched.ok) {
                result.message = "Received Non-200 HTTP Status Code ";
                return result;
            }
        }
        var pdf = [score];
        if (data.pageCount > 1) {
            const pdfapi = await (Object.getPrototypeOf(async function () { }).constructor())(url, cheerio, score, data.pageCount);
            if (error) return { doc: undefined, hasPDF: false };
            pdf = pdfapi.pdf;
        }
        const doc = new PDFDocument();
        var hasPDF = true;
        for (let i = 0; i < pdf.length; i++) {
            const page = pdf[i];
            try {
                const ext = page.split("?")[0].split(".").slice(-1)[0];
                if (ext === "svg") SVGtoPDF(doc, await streamToString(await requestStream(page)), 0, 0, { preserveAspectRatio: "xMinYMin meet" });
                else await PNGtoPDF(doc, page);
                if (i + 1 < data.pageCount) doc.addPage();
            } catch (err) {
                hasPDF = false;
                break;
            }
        }
        doc.end();
        return { doc: doc, hasPDF: hasPDF };
    }
}