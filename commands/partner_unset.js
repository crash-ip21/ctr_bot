const Duo = require('../db/models/duos');
const Lobby = require('../db/models/lobbies');

module.exports = {
  name: 'partner_unset',
  description: 'Unset your partner for Ranked Duos.',
  guildOnly: true,
  aliases: ['unset_partner', 'partner_remove', 'partner_u'],
  async execute(message) {
    const { author, guild } = message;

    const authorSavedDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: author.id }, { discord2: author.id }] });
    if (authorSavedDuo) {
      const lobby = await Lobby.findOne({
        duos: true,
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
