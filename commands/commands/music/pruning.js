const fs = require("fs");
const config = require("@root/config.json");

module.exports = {
  name: "pruning",
  commands: ["pruning"],
  description: "Toggle pruning of bot messages",
  callback:(message) => {
    config.PRUNING = !config.PRUNING;

    fs.writeFile("./config.json", JSON.stringify(config, null, 2), (err) => {
      if (err) {
        console.log(err);
        return message.channel.send("There was an error writing to the file.").catch(console.error);
      }

      return message.channel
        .send(`Message pruning is ${config.PRUNING ? "**enabled**" : "**disabled**"}`)
        .catch(console.error);
    });
  }
};