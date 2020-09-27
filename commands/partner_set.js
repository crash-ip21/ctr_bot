const Duo = require('../db/models/duos');
const RankedLobby = require('../db/models/ranked_lobbies').default;
const Player = require('../db/models/player');
const RankedBan = require('../db/models/ranked_bans');
const { DUOS } = require('../db/models/ranked_lobbies');

module.exports = {
  name: 'partner_set',
  description: 'Set your partner for Ranked Duos.',
  guildOnly: true,
  aliases: ['set_partner', 'partner_s', 'marry'],
  async execute(message) {
    if (!message.mentions.members.size) {
      return message.reply('you should tag your partner.');
    }

    const { author, guild } = message;

    const partner = message.mentions.members.first();

    const { client } = message;
    if (author.id === partner.id || partner.id === client.user.id) {
      return message.reply('very funny :)');
    }

    const authorVerified = message.member.roles.cache.find((r) => r.name.toLowerCase() === 'ranked verified');
    if (!authorVerified) {
      return message.reply('you are not verified.');
    }
    const partnerVerified = partner.roles.cache.find((r) => r.name.toLowerCase() === 'ranked verified');
    if (!partnerVerified) {
      return message.reply('your partner is not verified.');
    }

    const authorBanned = await RankedBan.findOne({ discordId: author.id, guildId: guild.id });
    if (authorBanned) {
      return message.reply('you are banned.');
    }
    const partnerBanned = await RankedBan.findOne({ discordId: partner.id, guildId: guild.id });
    if (partnerBanned) {
      return message.reply('your partner is banned.');
    }

    const authorPlayer = await Player.findOne({ discordId: author.id });
    if (!authorPlayer || !authorPlayer.psn) {
      return message.reply('you didn\'t set PSN');
    }

    const partnerPSN = await Player.findOne({ discordId: partner.id });
    if (!partnerPSN || !partnerPSN.psn) {
      return message.reply('your partner didn\'t set PSN');
    }

    const authorSavedDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: author.id }, { discord2: author.id }] });
    if (authorSavedDuo) {
      const savedPartner = authorSavedDuo.discord1 === author.id ? authorSavedDuo.discord2 : authorSavedDuo.discord1;
      return message.channel.send('...').then((m) => m.edit(`${author}, you've already set a partner: <@${savedPartner}>.`));
    }

    const partnerSavedDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: partner.id }, { discord2: partner.id }] });
    if (partnerSavedDuo) {
      return message.channel.send('...').then((m) => m.edit(`${author}, ${partner} already has another partner.`));
    }

    const lobby = await RankedLobby.findOne({ type: DUOS, players: { $in: [author.id, partner.id] } });
    if (lobby) {
      return message.reply('you can\'t set a partner while one of you are in a lobby.');
    }

    message.channel.send('...')
      .then((msg) => msg.edit(`${partner}, please confirm that you are a partner of ${author} for Ranked Duos.`))
      .then((confirmMessage) => {
        confirmMessage.react('✅');

        const filter = (r, u) => r.emoji.name === '✅' && u.id === partner.id;
        confirmMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
          .then(async (collected) => {
            // eslint-disable-next-line no-shadow
            const lobby = await RankedLobby.findOne({ type: DUOS, players: author.id });
            if (lobby) {
              return confirmMessage.edit(`Command cancelled: ${author} joined a lobby.`);
            }

            const authorDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: author.id }, { discord2: author.id }] });
            const partnerDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: partner.id }, { discord2: partner.id }] });
            if (authorDuo || partnerDuo) {
              return confirmMessage.edit('Command cancelled: one of you have already set a partner.');
            }

            const duo = new Duo();
            duo.guild = guild.id;
            duo.discord1 = author.id;
            duo.discord2 = partner.id;
            duo.date = new Date();
            duo.save().then(() => {
              confirmMessage.edit(`${author} & ${partner} duo has been set.`);
            });
          })
          .catch(() => {
            confirmMessage.edit('Command cancelled.');
          });
      });
  },
};
