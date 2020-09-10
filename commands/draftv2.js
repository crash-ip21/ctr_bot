const Discord = require('discord.js');
const axios = require('axios');
const config = require('../config');

module.exports = {
  name: 'draftv2',
  description: `Generate draft links using the new draft tool
\`!draftv2 [type] @CaptainA @CaptainB [bans] [picks] [timeout]\``,
  guildOnly: true,
  cooldown: 10,
  execute(message, args) {
    const wrongSyntax = 'Wrong command usage. Try `!draftv2 [type] @CaptainA @CaptainB [bans] [picks] [timeout]`.';

    const params = message.content.split(' ');
    params.shift(); // remove command

    const mode = params[0] === 'battle' ? 2 : 1;
    const { mentions } = message;
    const mentionedUsers = mentions.users.array();
    let bans = params[3] ?? (params[0] === 'battle' ? 1 : 3);
    let picks = params[4] ?? (params[0] === 'battle' ? 3 : 5);
    let timeout = params[5] ?? null;

    if (params.length < 3 || mentionedUsers.length < 2) {
      return message.channel.send(wrongSyntax);
    }

    if (!message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])
      && !mentionedUsers.map((m) => m.id).includes(message.author.id)) {
      return message.channel.send('You should be one of the players doing the draft.');
    }

    let post = {
      mode: mode,
      teamA: 'Team A',
      teamB: 'Team B',
      bans: bans,
      picks: picks,
      timeout: timeout
    };

    message.channel.send(`Connecting to ${config.draft_tool_url} ...`);

    axios({
      url: `${config.draft_tool_url}index.php?action=createDraft`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      params: post
    }).then((r) => {
        let data = r.data;
        let errors = data.errors ?? [];

        if (errors.length > 0) {
          return message.channel.send('```' + errors.join('\n') + '```');
        } else {
          let draftData = data.draftData;
          let spectatorUrl = `${config.draft_tool_url}index.php?action=show&id=${draftData.id}`;
          let teamALink = `${spectatorUrl}&accessKey=${draftData.accessKeyA}`;
          let teamBLink = `${spectatorUrl}&accessKey=${draftData.accessKeyB}`;

          const promise1 = mentionedUsers[0].createDM()
            .then((dm) => dm.send(`Here is your draft link for the war with ${post.teamB}:\n${teamALink}`))
            .catch(() => message.channel.send(`Couldn't send a DM to ${mentions[0]}.\n${post.teamA} link:\n${teamALink}`));

          const promise2 = mentionedUsers[1].createDM()
            .then((dm) => dm.send(`Here is your draft link for the war with ${post.teamA}:\n${teamBLink}`))
            .catch(() => message.channel.send(`Couldn't send a DM to ${mentions[1]}.\n${post.teamB} link:\n${teamBLink}`));

          Promise.all([promise1, promise2]).then(() => {
            message.channel.send(`I've messaged both captains: ${mentionedUsers.join(', ')} with team links.
Spectator link: <${spectatorUrl}>`);
          });
        }
    }).catch((error) => {
      message.channel.send(`Could not connect to ${config.draft_tool_url} D:`);
    });
  }
}
