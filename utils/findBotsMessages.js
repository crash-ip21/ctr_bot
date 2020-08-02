const Discord = require('discord.js');

module.exports = function findBotsMessages(message, numberOfPost, channelNames, callback) {
  const { client, guild } = message;

  return channelNames.map((channelName) => {
    let channel;
    if (channelName.match(Discord.MessageMentions.CHANNELS_PATTERN)) {
      channel = message.mentions.channels.first();
    } else {
      channelName = channelName.replace(/^#/, '');
      channel = message.guild.channels.cache.find((c) => c.name === channelName);
    } if (!channel) {
      return message.channel.send(`Can't find channel ${channelName}`);
    }
    return channel.messages.fetch({ limit: 100 }).then((messages) => {
      let count = 0;
      const result = messages.some((msg) => {
        if (msg.author.id === client.user.id) {
          count += 1;
          if (count === numberOfPost) {
            return callback(msg);
          }
        }
        return false;
      });

      if (!result) {
        return message.channel.send(`I didn't find my message in ${channelName} channel`);
      }
      return result;
    });
  });
};
