const Clan = require('../db/models/clans');
const Player = require('../db/models/player');
const Rank = require('../db/models/rank');

const {
  _4V4, BATTLE, DUOS, ITEMLESS, ITEMS,
} = require('../db/models/ranked_lobbies');

const ranks = {
  [ITEMS]: 'Items',
  [ITEMLESS]: 'Itemless',
  [DUOS]: 'Duos',
  [BATTLE]: 'Battle',
  [_4V4]: '4v4',
};

/**
 * Gets the ranking position for a given mode
 * @param rank
 * @param mode
 * @returns {number | string}
 */
function getRankingPosition(rank, mode) {
  mode = mode.toLowerCase();
  let position;

  if (!rank[mode]) {
    position = '-';
  } else {
    position = rank[mode].position + 1;

    if (Number.isNaN(position)) {
      position = '-';
    }
  }

  return position;
}

/**
 * Gets the ranking rating for a given mode
 * @param rank
 * @param mode
 * @returns {number | string}
 */
function getRankingRating(rank, mode) {
  mode = mode.toLowerCase();
  let rating;

  if (!rank[mode]) {
    rating = '-';
  } else {
    rating = parseInt(rank[mode].rank, 10);

    if (Number.isNaN(rating)) {
      rating = '-';
    }
  }

  return rating;
}

/**
 * Returns the profile embed
 * @param guildMember
 * @param fields
 */
function getEmbed(guildMember, fields) {
  let avatarUrl;
  if (guildMember.user.avatar) {
    avatarUrl = `https://cdn.discordapp.com/avatars/${guildMember.user.id}/${guildMember.user.avatar}.png`;
  } else {
    avatarUrl = 'https://discordapp.com/assets/322c936a8c8be1b803cd94861bdfa868.png';
  }

  const embed = {
    timestamp: new Date(),
    thumbnail: {
      url: avatarUrl,
    },
    footer: {
      text: `ID: ${guildMember.user.id}`,
    },
    author: {
      name: `${guildMember.user.username}#${guildMember.user.discriminator}'s profile${guildMember.user.bot ? ' (Bot)' : ''}`,
      icon_url: avatarUrl,
    },
    fields,
  };

  const colorRoles = [
    'admin',
    'staff',
    'donator',
    'tournament champion',
    'ranked champion',
    'captain',
    'server booster',
  ];

  let colorRole;

  colorRoles.some((colorRoleName) => {
    const r = guildMember.roles.cache.find((role) => role.name.toLowerCase() === colorRoleName);
    if (r) {
      colorRole = r;
      return true;
    }
  });

  if (colorRole) {
    embed.color = colorRole.color;
  }

  return embed;
}

module.exports = {
  name: 'profile',
  usage: '@user',
  description: 'Check a player profile.',
  guildOnly: true,
  aliases: ['p', 'rank'],
  execute(message, args) {
    let user = message.author;

    if (args.length > 0) {
      user = message.mentions.users.first();

      if (!user) {
        return message.channel.send('You need to mention a user.');
      }
    }

    const guildMember = message.guild.member(user);
    const embedFields = [];

    Player.findOne({ discordId: user.id }).then((player) => {
      Clan.find().then((clans) => {
        /* Profile */
        let voiceChat = [];
        let psn;
        let flag;
        let nat;
        let favCharacter;
        let favTrack;
        let birthday;

        if (!player) {
          psn = '-';
          flag = '-';
          nat = '-';
          favCharacter = '-';
          favTrack = '-';
          birthday = '-';
        } else {
          psn = player.psn || '-';
          flag = player.flag || '-';
          nat = player.nat || '-';
          favCharacter = player.favCharacter || '-';
          favTrack = player.favTrack || '-';

          if (!player.birthday) {
            birthday = '-';
          } else {
            const birthDate = new Date(player.birthday);
            birthday = `${birthDate.toLocaleString('default', { month: 'short' })} ${birthDate.getDate()}, ${birthDate.getFullYear()}`;
          }

          if (player.discordVc) {
            voiceChat.push('Discord');
          }

          if (player.ps4Vc) {
            voiceChat.push('PS4');
          }
        }

        if (voiceChat.length < 1) {
          voiceChat = ['-'];
        }

        const profile = [
          `**PSN**: ${psn}`,
          `**Country**: ${flag}`,
          `**Birthday**: ${birthday}`,
          `**Voice Chat**: ${voiceChat.join(', ')}`,
          `**NAT Type**: ${nat}`,
          `**Joined**: ${guildMember.joinedAt.toLocaleString('default', { month: 'short' })} ${guildMember.joinedAt.getDate()}, ${guildMember.joinedAt.getFullYear()}`,
          `**Registered**: ${guildMember.user.createdAt.toLocaleString('default', { month: 'short' })} ${guildMember.user.createdAt.getDate()}, ${guildMember.user.createdAt.getFullYear()}`,
        ];

        if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === 'ranked verified')) {
          profile.push('**Ranked Verified** :white_check_mark:');
        }

        if (guildMember.user.bot) {
          profile.push('**Discord Bot** :robot:');
        }

        embedFields.push({
          name: ':busts_in_silhouette: Profile',
          value: profile.join('\n'),
          inline: true,
        });

        /* Game Data */
        let playerClans = [];

        clans.forEach((c) => {
          const role = guildMember.roles.cache.find((r) => r.name.toLowerCase() === c.fullName.toLowerCase());

          if (role) {
            playerClans.push(c.shortName);
          }
        });

        if (playerClans.length < 1) {
          playerClans = ['-'];
        }

        const gameData = [
          `**Clans**: ${playerClans.join(', ')}`,
          `**Fav. Character**: ${favCharacter}`,
          `**Fav. Track**: ${favTrack}`,
        ];

        embedFields.push({
          name: ':video_game: Game Data',
          value: gameData.join('\n'),
          inline: true,
        });

        embedFields.push({ name: '\u200B', value: '\u200B' });

        /* Ranks */
        Rank.findOne({ name: psn }).then((rank) => {
          let playerRanks;

          if (!rank) {
            playerRanks = [
              '**FFA**: -',
              '**Itemless**: -',
              '**Duos**: -',
              '**Battle**: -',
              '**4 vs. 4**: -',
            ];
          } else {
            const itemsRanking = getRankingPosition(rank, ranks[ITEMS]);
            const itemlessRanking = getRankingPosition(rank, ranks[ITEMLESS]);
            const duosRanking = getRankingPosition(rank, ranks[DUOS]);
            const battleRanking = getRankingPosition(rank, ranks[BATTLE]);
            const _4v4Ranking = getRankingPosition(rank, ranks[_4V4]);

            playerRanks = [
              `**FFA**: ${itemsRanking !== '-' ? `#${itemsRanking} - ${getRankingRating(rank, ranks[ITEMS])}` : '-'}`,
              `**Itemless**: ${itemlessRanking !== '-' ? `#${itemlessRanking} - ${getRankingRating(rank, ranks[ITEMLESS])}` : '-'}`,
              `**Duos**: ${duosRanking !== '-' ? `#${duosRanking} - ${getRankingRating(rank, ranks[DUOS])}` : '-'}`,
              `**Battle**: ${battleRanking !== '-' ? `#${battleRanking} - ${getRankingRating(rank, ranks[BATTLE])}` : '-'}`,
              `**4 vs. 4**: ${_4v4Ranking !== '-' ? `#${_4v4Ranking} - ${getRankingRating(rank, ranks[_4V4])}` : '-'}`,
            ];
          }

          embedFields.push({
            name: ':checkered_flag: Rankings',
            value: playerRanks.join('\n'),
            inline: true,
          });

          /* Achievements */
          const achievements = [];

          if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === 'admin')) {
            achievements.push('Administrator');
          }

          if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === 'staff')) {
            achievements.push('Staff Member');
          }

          if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === 'donator')) {
            achievements.push('Donator');
          }

          if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === 'world cup champion')) {
            achievements.push('World Cup Champion');
          }

          if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === 'tournament champion')) {
            achievements.push('Tournament Champion');
          }

          if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === 'ranked champion')) {
            achievements.push('Ranked Champion');
          }

          if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === 'captain')) {
            achievements.push('Captain');
          }

          if (guildMember.roles.cache.find((r) => r.name.toLowerCase() === 'server booster')) {
            achievements.push('Server Booster');
          }

          const currentDate = new Date();
          if (currentDate.getFullYear() - guildMember.joinedAt.getFullYear() >= 1) {
            achievements.push('Member for over 1 year');
          }

          if (achievements.length < 1) {
            achievements.push('-');
          }

          embedFields.push({
            name: `:trophy: Achievements (${achievements.length})`,
            value: achievements.join('\n'),
            inline: true,
          });

          embedFields.push({ name: '\u200B', value: '\u200B' });

          /* Roles */
          const roles = [];

          guildMember.roles.cache.sort((a, b) => b.rawPosition - a.rawPosition || b.id - a.id).forEach((r) => {
            if (r.name.toLowerCase() !== '@everyone') {
              roles.push(`<@&${r.id}>`);
            }
          });

          if (roles.length < 1) {
            roles.push('None');
          }

          embedFields.push({
            name: `:art: Roles (${roles.length})`,
            value: roles.join(', '),
            inline: true,
          });

          /* Commands */
          const commands = [
            '`!set_psn`',
            '`!set_country`',
            '`!set_birthday`',
            '`!set_nat`',
            '`!set_voice_chat`',
            '`!set_character`',
            '`!set_track`',
          ];

          embedFields.push({
            name: ':gear: Customize your profile!',
            value: commands.join('\n'),
            inline: true,
          });

          const embed = getEmbed(guildMember, embedFields);
          return message.channel.send({ embed });
        });
      });
    });

    return true;
  },
};
