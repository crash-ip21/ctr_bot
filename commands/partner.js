const Duo = require('../db/models/duos');

module.exports = {
  name: 'partner',
  description: 'Check your partner for Ranked Duos',
  guildOnly: true,
  async execute(message) {
    const { author, guild } = message;

    const authorSavedDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: author.id }, { discord2: author.id }] });
    if (authorSavedDuo) {
      const savedPartner = authorSavedDuo.discord1 === author.id ? authorSavedDuo.discord2 : authorSavedDuo.discord1;
      message.reply('...').then((m) => m.edit(`${author}, your partner is <@${savedPartner}>.`));
    } else {
      message.reply('your don\'t have a partner.');
    }
  },
};
