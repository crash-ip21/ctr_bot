const Team = require('../db/models/teams');
const RankedLobby = require('../db/models/ranked_lobbies').default;
const { _4V4 } = require('../db/models/ranked_lobbies');

module.exports = {
  name: 'team_unset',
  description: 'Unset your team for Ranked 4v4.',
  guildOnly: true,
  aliases: ['unset_team', 'team_u'],
  async execute(message) {
    const { author, guild } = message;

    const team = await Team.findOne({ guild: guild.id, players: author.id });
    if (team) {
      const lobby = await RankedLobby.findOne({
        type: _4V4,
        players: { $in: team.players },
      });
      if (lobby) {
        return message.reply('you can\'t unset team while being in the lobby with them.');
      }
      team.delete().then(() => message.reply('your team has been unset.'));
    } else {
      message.reply('your don\'t have a team.');
    }
  },
};
