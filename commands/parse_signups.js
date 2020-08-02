const fetchMessages = require('../utils/fetchMessages');
const { parseWCSignup } = require('../utils/SignupsParser');

module.exports = {
  name: 'parse_signups',
  description: 'Parsing signups',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args, guild = null) {
    function getRowValue(row, key = []) {
      row = row.replace(key, '').trim(); // eslint-disable-line no-param-reassign
      row = row.replace(/\(.+?\)/, '').trim(); // eslint-disable-line no-param-reassign
      return row.split(/[:;]/).pop().trim();
    }

    let server;
    if (guild) {
      server = guild;
    } else {
      server = message.guild;
    }

    if (!args.length) {
      return message.channel.send('You should specify the channel.');
    }

    let channel;
    if (message.mentions.channels.size) {
      channel = message.mentions.channels.first();
    } else {
      const channelName = args[0];
      channel = server.channels.cache.find((c) => c.name === channelName);
    }

    const SEPARATOR = ',';
    // const firstRow = ['#', 'Team Name', 'PSN 1', 'PSN 2', 'Discord 1 Tag', 'Discord 1 ID', 'Discord 2 Tag', 'Discord 2 ID', 'Host', 'Author Tag', 'Author ID', 'Is Valid'];
    let firstRow;
    const out = [];

    // out.push(firstRow.join(SEPARATOR));

    const table = [];

    fetchMessages(channel, 500).then((messages) => {
      let count = 0;
      let hosts = 0;

      const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      sortedMessages.forEach((m, index) => {
        if (index === 0) return; // ignore first message

        if (m.type === 'PINS_ADD' || m.author.bobt) {
          return;
        }

        if (m.author.bot) {
          return;
        }

        count += 1;

        let data;
        if (channel.name === 'world-cup-signups') {
          data = parseWCSignup(m);
        } else {
          data = message.client.parseSignup(m);
        }
        if (data.host) hosts += 1;

        data.valid = !data.errors.length;
        delete data.errors;

        if (!firstRow) {
          firstRow = ['#', ...Object.keys(data)];
        }

        // eslint-disable-next-line max-len
        // '#', 'Team Name', 'PSN 1', 'PSN 2', 'Discord 1 Tag', 'Discord 1 ID', 'Discord 2 Tag', 'Discord 2 ID', 'Host', 'Author Tag', 'Author ID', 'Is Valid'

        // eslint-disable-next-line max-len
        // const row = [i, data.teamName, data.psn1, data.psn2, data.discordTag1, data.discordId1, data.discordTag2, data.discordId2, data.host, data.authorTag, data.authorId, data.valid];
        const row = [count, ...Object.values(data)];
        out.push(row.join(SEPARATOR));

        data.createdAt = m.createdTimestamp;
        table.push(data);
        // console.log(`OK: ${isValid}`);
        // console.log(data);
        // console.log('----------');
      });

      out.unshift(firstRow);

      // eslint-disable-next-line no-console
      console.table(table);

      if (message) {
        const txt = out.join('\n');

        message.channel.send(`${count} signups\n${hosts} hosts`, {
          files: [{
            attachment: Buffer.from(txt, 'utf-8'),
            name: 'signups.csv',
          }],
        });

        message.channel.stopTyping();
      }
    });
  },
};
