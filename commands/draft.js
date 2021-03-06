const Discord = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'draft',
  description: `Generate draft links
\`!draft
Team A: @CaptainA
Team B: @CaptainB\``,
  guildOnly: true,
  cooldown: 10,
  execute(message, args) {
    const wrongSyntax = `Wrong command usage. Example:
\`!draft
Team A: @CaptainA
Team B: @CaptainB\``;
    const { mentions } = message;

    const rows = message.content.split('\n');
    rows.shift();

    if (rows.length !== 2) {
      return message.channel.send(wrongSyntax);
    }

    if (mentions.users.size !== 2) {
      return message.channel.send('You should mention two team captains');
    }

    if (!message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])
      && !mentions.users.map((m) => m.id).includes(message.author.id)) {
      return message.channel.send('You should be a captain of one of the teams');
    }

    const teams = [];
    const captainUsers = mentions.users.array();

    const captainMemberPromises = captainUsers.map((c) => message.guild.members.fetch(c));

    Promise.all(captainMemberPromises).then((captains) => {
      rows.every((row) => {
        const data = row.split(':');
        if (data.length !== 2) {
          message.channel.send(wrongSyntax);
          return false;
        }
        const mention = data[1];
        if (!mention.match(Discord.MessageMentions.USERS_PATTERN)) {
          return message.channel.send(wrongSyntax);
        }
        const name = data[0].trim();
        teams.push(name);
        return true;
      });

      return message.channel.send(`Select draft mode. Waiting 1 minute.
\`\`\`
0 - Classic - 6 Bans, 10 Picks
1 - League  - 6 Bans,  8 Picks
2 - Light   - 4 Bans,  6 Picks
3 - No Ban  - 0 Bans, 10 Picks
\`\`\``).then((confirmMessage) => {
        message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
          .then((collected) => {
            const collectedMessage = collected.first();
            const { content } = collectedMessage;
            collectedMessage.delete();
            console.log(content);
            if (['0', '1', '2', '3'].includes(content)) {
              confirmMessage.edit('Connecting to `draft.crashteamranking.com`...').then((m) => {
                const teamB = teams[1];
                const teamA = teams[0];
                axios.post('https://draft.crashteamranking.com/drafttool.php', null, {
                  params: {
                    msgID: 0,
                    teamA,
                    teamB,
                    draftMode: content,
                  },
                }).then((r) => {
                  const { ID, hashA, hashB } = r.data;
                  const lobbyLink = 'https://draft.crashteamranking.com/lobby.php?id=';
                  const specLink = lobbyLink + ID;
                  const teamALink = `${specLink}&hash=${hashA}`;
                  const teamBLink = `${specLink}&hash=${hashB}`;

                  const captainA = captains[0];
                  const captainB = captains[1];

                  const captainAPromise = captainA.createDM()
                    .then((dm) => dm.send(`Draft link for a war with ${teamB}:\n${teamALink}`))
                    .catch(() => m.channel.send(`Couldn't message ${captainA}.\n${teamA} link:\n${teamALink}`));

                  const captainBPromise = captainB.createDM()
                    .then((dm) => dm.send(`Draft link for a war with ${teamB}:\n${teamBLink}`))
                    .catch(() => m.channel.send(`Couldn't message ${captainB}.\n${teamB} link:\n${teamBLink}`));

                  Promise.all([captainAPromise, captainBPromise]).then(() => {
                    m.edit(`I've messaged both captains: ${captains.join(', ')} with team links.
Spectator link: <${specLink}>`);
                  });
                }).catch((error) => {
                  message.channel.send('Couldn\'t connect to `draft.crashteamranking.com\nTry again later.`');
                });
              });
            } else {
              throw new Error('cancel');
            }
          })
          .catch(() => confirmMessage.edit('Command cancelled.'));
      });
    }).catch((error) => {
      throw error;
    });
  },
};
