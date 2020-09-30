const Duo = require('../db/models/duos');
const RankedLobby = require('../db/models/ranked_lobbies').default;
const { DUOS } = require('../db/models/ranked_lobbies');

module.exports = {
  name: 'partner_unset',
  description: 'Unset your partner for Ranked Duos.',
  guildOnly: true,
  aliases: ['unset_partner', 'partner_remove', 'partner_u', 'divorce'],
  async execute(message) {
    const { author, guild } = message;

    const authorSavedDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: author.id }, { discord2: author.id }] });
    if (authorSavedDuo) {
      const lobby = await RankedLobby.findOne({
        type: DUOS,
        players: { $in: [authorSavedDuo.discord1, authorSavedDuo.discord2] },
      });
      if (lobby) {
        return message.reply('you can\'t unset partner while being in the lobby with them.');
      }
      authorSavedDuo.delete().then(() => message.reply('your partner has been unset.'));
    } else {
      message.reply('your don\'t have a partner.');
    }
  },
};
