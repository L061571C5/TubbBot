const MojangAPI = require("mojang-api");
module.exports = class MinecraftCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'minecraft',
            aliases: ['mc'],
            group: 'fun',
            memberName: 'minecraft',
            description: 'Connect to the Minecraft API and display information.',
            args: [
                {
                    key: 'query',
                    prompt: 'What group would you like to search into? Options: profile, server, history',
                    type: 'string'
                },
                {
                    key: 'query2',
                    prompt: 'What is the username/server ip that you would like to search for?',
                    type: 'string'
                },

            ]
        });
    }


    async run(message, { query, query2 }) {
        query = query.toLowerCase()
        query2 = query2.toLowerCase()
        //const args = query.split(" ");
        //args.shift();
        let str;
        if (query === "profile" || query === "pro") {
            if (query2) str = query2;
            if (str.length <= 16) MojangAPI.nameToUuid(str, function (err, res) {
                if (err) return message.reply("there was an error trying to convert the username into UUID!");
                else if (!res[0]) return message.channel.send("No player named **" + str + "** were found")
                MojangAPI.profile(res[0].id, function (err, res) {
                    if (err) message.reply("there was an error trying to fetch the user's profile!");
                    else {
                        let skin = "https://visage.surgeplay.com/full/256/" + res.id;
                        const Embed = new Discord.MessageEmbed()
                            .setColor('#000000')
                            .setTitle(res.name)
                            .setDescription("Profile:")
                            .addField("UUID", res.id, true)
                            .addField("Username", res.name, true)
                            .setImage(skin)
                            .setTimestamp()
                            .setFooter("Powered by Mojang Api", message.client.user.displayAvatarURL());
                        message.channel.send(Embed);
                    }
                });
            });
            else
                MojangAPI.profile(str, function (err, res) {
                    if (err) message.reply("there was an error trying to fetch the user's profile!");
                    else {
                        let skin = "https://visage.surgeplay.com/full/256/" + res.id;

                        const Embed = new Discord.MessageEmbed()
                            .setColor('#000000')
                            .setTitle(res.name)
                            .setDescription("Profile:")
                            .addField("UUID", res.id, true)
                            .addField("Username", res.name, true)
                            .setImage(skin)
                            .setTimestamp()
                            .setFooter(
                                "Powered by Mojang Api",
                                message.client.user.displayAvatarURL()
                            );
                        message.channel.send(Embed);
                    }
                });
        } else if (query === "server" || query === "srv") {
            const url = `https://api.mcsrvstat.us/2/${query2}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Received HTTP Status Code " + res.status);
            const body = await res.json();
            if (body.online) {
                const ip = body.ip;
                const port = body.port;
                const player = body.players.online + " / " + body.players.max;
                const version = body.version;
                const hostname = body.hostname;
                const desc = body.motd.clean.join("\n");
                const spaceRemoved = desc.replace(/ +(?= )/g, '');
                const Embed = new Discord.MessageEmbed()
                    .setTitle(query2)
                    .setColor('#000000')
                    .addField("IP", "`" + ip + "`", true)
                    .addField("Port", "`" + port + "`", true)
                    .addField("Player/Max", "`" + player + "`", true)
                    .addField("Version", "`" + version + "`", true)
                    .addField("Hostname", "`" + hostname + "`", true)
                    .addField("Description", "`" + spaceRemoved + "`")
                    .setTimestamp()
                    .setFooter("Powered by Mojang Api", message.client.user.displayAvatarURL());
                return message.channel.send(Embed);
            } else {
                return message.channel.send("The server - **" + query2 + "** - is offline/under maintenance.")
            }
        } else if (query === "history" || query === "his") {
            MojangAPI.nameToUuid(args[1], function (err, res) {
                if (err) return message.reply("there was an error trying to convert the username into UUID!");
                else if (!res[0]) return message.channel.send("No player named **" + query2 + "** were found");
                MojangAPI.nameHistory(res[0].id, function (err, result) {
                    if (err) return message.reply("there was an error trying to fetch the username history!");
                    else {
                        var names = [];
                        var num = 0
                        for (var i = result.length - 1; i > -1; i--) {
                            ++num;
                            if (num === 1) names.push("**" + num + ". " + result[i].name + "**");
                            else names.push(num + ". " + result[i].name);
                        }
                        const Embed = new Discord.MessageEmbed()
                            .setColor('#000000')
                            .setTitle(res[0].name + "'s Username History")
                            .setDescription(names.join("\n"))
                            .setFooter("Last changed on " + new Date(result[result.length - 1].changedToAt), message.client.user.displayAvatarURL());
                        message.channel.send(Embed);
                    }
                });
            });
        }
    }
};