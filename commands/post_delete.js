const Discord = require('discord.js');

module.exports = {
  name: 'post_delete',
  description: 'Delete post message in channels.',
  args: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    // noinspection DuplicatedCode
    const { guild, client } = message;

    let numberOfPost = Number(args[0]);
    let channelNames;
    const rows = message.content.split('\n');
    rows.shift();

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(numberOfPost)) {
      numberOfPost = 1;
      channelNames = args;
    } else {
      channelNames = rows.shift().trim().split(/ +/);
    }

    const promises = channelNames.map((channelName) => {
      let channel;
      if (channelName.match(Discord.MessageMentions.CHANNELS_PATTERN)) {
        channel = message.mentions.channels.first();
      } else {
        channelName = channelName.replace(/^#/, '');
        channel = message.guild.channels.cache.find((c) => c.name === channelName);
      } if (!channel) {
        return message.channel.send(`Couldn't find channel ${channelName}`);
      }
      channel.messages.fetch({ limit: 100 }).then((messages) => {
        let count = 0;
        const result = messages.some((msg) => {
          if (msg.author.id === client.user.id) {
            count += 1;
            if (count === numberOfPost) {
              return msg.delete();
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

    Promise.all(promises).then(() => {
      message.channel.send('Done');
    });
  },
};
