const Clan = require('../db/models/clans');
const Player = require('../db/models/player');
const createPagination = require('../utils/createPagination');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function createCaseInsensitiveRegEx(s) {
  return new RegExp(`^${(escapeRegExp(s))}$`, 'i');
}

/**
 * Returns the embed for the clan list
 * @param maxClans
 * @param clans
 * @param page
 * @param pages
 * @returns {{footer: {text: string}, author: {icon_url: *, name: string}, description: *, fields: [{name: string, value: *}]}}
 */
function getEmbed(maxClans, clans, page, pages) {
  return {
    fields: [
      {
        name: `Clans (${maxClans})`,
        value: clans.join('\n'),
      }
    ],
    footer: {
      text: `Page ${page} of ${pages}`,
    }
  }
}

module.exports = {
  name: 'clans',
  description(message) {
    if (message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])) {
      return `Show clan members: \`!clan CTR\`
Edit clans:
\`!clan add CTR Crash Team Racing
!clan delete CTR\``;
    }

    return 'Show clan members: `!clan CTR`';
  },
  aliases: ['clan'],
  guildOnly: true,
  execute(message, args) {
    if (!args.length) {
      Clan.find().then((clans) => {
        message.guild.members.fetch().then((members) => {
          // const sortedClans = clans.sort(() => 0.5 - Math.random());

          let membersCount = 0;

          const clansObjects = [];
          clans.forEach((c) => {
            const clanRole = message.guild.roles.cache.find((r) => r.name.toLowerCase() === c.fullName.toLowerCase());
            if (clanRole) {
              const { size } = clanRole.members;
              membersCount += size;
              clansObjects.push({
                shortName: c.shortName,
                fullName: c.fullName,
                size,
              });
            }
          });

          const clanList = clansObjects
            .sort((a, b) => b.size - a.size)
            .map((c) => `${c.shortName}: **${c.fullName}** (${c.size} members)`)
          ;
          
          const elementsPerPage = 20;
          let page = 1;
          let pagination = createPagination(clanList, page, elementsPerPage);
          let embed = getEmbed(clanList.length, pagination.elements, page, pagination.pages);

          message.channel.send({ embed: embed }).then((m) => {
            if (pagination.pages > 1) {
              m.react('⬅️');
              m.react('➡️');
  
              // only the user that executed the command can react
              const filter = (r, u) => (['⬅️', '➡️'].includes(r.emoji.name) && u.id !== m.author.id && u.id === message.author.id);
              const options = {
                time: 3600000,
                errors: ['time'],
                dispose: true,
              };
              
              const collector = m.createReactionCollector(filter, options);
              collector.on('collect', (reaction, user) => {
                if (reaction.message.id === m.id) {
                  if (reaction.emoji.name === '⬅️') {
                    page -= 1;
        
                    if (page < 1) {
                      page = 1;
                    }
                  }
                  
                  if (reaction.emoji.name === '➡️') {
                    page += 1;
                    
                    if (page > pagination.pages) {
                      page = pagination.pages;
                    }
                  }
                  
                  pagination = createPagination(clanList, page, elementsPerPage);
                  embed = getEmbed(clanList.length, pagination.elements, page, pagination.pages);
                  
                  m.edit({ embed: embed });
                }
                
                reaction.users.remove(user);
              });
            }
          });
        });
      });

      return;
    }

    const action = args[0];

    const ADD = 'add';
    const DELETE = 'delete';
    const REMOVE = 'remove';

    const actions = [ADD, DELETE, REMOVE];
    if (actions.includes(action)) {
      if (!message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])) {
        return message.channel.send('You don\'t have permission to do that!');
      }

      const shortName = args[1];
      const fullName = args.slice(2).join(' ');
      let clan = null;

      switch (action) {
        //  !clan add CTR Crash Team Racing
        //  !clan add_member CTR @tag
        //  !clan remove_member
        //  @Staff
        //  !clan_member add [CTR] @tag
        //  !clan_member remove CTR @tag
        case ADD:
          const { guild } = message;
          const clanRole = guild.roles.cache.find((r) => r.name === fullName);

          const regexShortName = createCaseInsensitiveRegEx(shortName);

          Clan.findOne({ shortName: { $regex: regexShortName } }).then((doc) => {
            if (doc) {
              message.channel.send('There is already a clan with this short name.');
              return;
            }
            // eslint-disable-next-line no-case-declarations
            clan = new Clan();
            clan.shortName = shortName;
            clan.fullName = fullName;
            clan.save().then(() => {
              message.channel.send(`Clan \`${shortName}\` was created.`);
            });

            if (!clanRole) {
              guild.roles.create({ data: { name: fullName, hoist: true } })
                .then(() => {
                  message.channel.send(`Role \`${fullName}\` was created.`);
                });
            } else {
              message.channel.send(`Role \`${fullName}\` already exists.`);
            }
          });
          break;

        // !clan delete CTR
        case REMOVE:
        case DELETE:
          clan = Clan.findOne({ shortName }).then((doc) => {
            if (doc) {
              doc.delete().then(() => {
                message.channel.send(`Clan ${shortName} was deleted.`);
              });
            } else {
              message.channel.send(`Clan ${shortName} was not found.`);
            }
          });
          break;
      }
    } else {
      // !clan CTR
      // !clan Crash Team Racing
      const clanName = args[0];
      const clanFullName = args.join(' ');

      const regexShortName = createCaseInsensitiveRegEx(clanName);
      const regexFullName = createCaseInsensitiveRegEx(clanFullName);

      Clan.findOne().or([
        { shortName: { $regex: regexShortName } },
        { fullName: { $regex: regexFullName } },
      ])
        .then((clan) => {
          if (clan) {
            const clanRole = message.guild.roles.cache
              .find((c) => c.name.toLowerCase() === clan.fullName.toLowerCase());

            if (!clanRole) return message.channel.send('Clan role was not found.');

            message.guild.members.fetch().then((members) => {
              const captains = [];
              const players = [];

              const memberIds = members.map((m) => m.id);

              Player.find({ discordId: { $in: memberIds } }).then((docs) => {
                members
                  .sort((a, b) => a.displayName.localeCompare(b.displayName))
                  .forEach((m) => {
                    if (m.roles.cache.has(clanRole.id)) {
                      if (m.roles.cache.find((r) => r.name === 'Captain')) {
                        captains.push(m);
                      } else {
                        players.push(m);
                      }
                    }
                  });

                const toPing = (p) => {
                  let s = p.toString();
                  const player = docs.find((f) => f.discordId === p.user.id);
                  if (player && player.flag) s += ` ${player.flag}`;
                  return s;
                };
                const description = `**${clanRole.name}** (${clanRole.members.size} members)

Captain:
${captains.map(toPing).join('\n')}

Members:
${players.map(toPing).join('\n')}`;

                message.channel.send('...').then((m) => {
                  m.edit(description).then();
                });
              });
            });
          } else {
            return message.channel.send('There is no clan with this name.');
          }
        });
    }
  },
};
