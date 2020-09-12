const axios = require('axios');
const moment = require('moment');
const { CronJob } = require('cron');
const AsyncLock = require('async-lock');
const Duo = require('../db/models/duos');
const Player = require('../db/models/player');
const Rank = require('../db/models/rank');
const Lobby = require('../db/models/lobbies');
const Room = require('../db/models/rooms');
const Sequence = require('../db/models/sequences');
const Counter = require('../db/models/counters');
const Cooldown = require('../db/models/cooldowns');
const RankedBan = require('../db/models/ranked_bans');
const { client } = require('../bot');
const rngPoolFFa = require('../utils/rngPoolFFa');
const generateTemplateFFA = require('../utils/generateTemplateFFA');
const { parseData } = require('../table');
const sendLogMessage = require('../utils/sendLogMessage');
const config = require('../config.js');

const lock = new AsyncLock();

function getTitle(doc) {
  return `${doc.locked.$isEmpty() ? '' : 'Locked '}${doc.duos ? 'Duos' : doc.items ? 'Item' : 'Itemless'} Lobby ${doc.pools ? '(pools)' : '(full rng)'}`;
}

function getFooter(doc) {
  return { text: `id: ${doc._id}` };
}

const itemsIcon = 'https://vignette.wikia.nocookie.net/crashban/images/3/32/CTRNF-BowlingBomb.png';
const itemlessIcon = 'https://vignette.wikia.nocookie.net/crashban/images/9/96/NF_Champion_Wheels.png';
const duosIcon = 'https://vignette.wikia.nocookie.net/crashban/images/8/83/CTRNF-AkuUka.png';

const PLAYER_DEFAULT_RANK = 1200;
const DEFAULT_RANK = PLAYER_DEFAULT_RANK;

async function getPlayerInfo(playerId, items, duos) {
  const p = await Player.findOne({ discordId: playerId });
  const rank = await Rank.findOne({ name: p.psn });
  let rankValue = DEFAULT_RANK;
  if (rank) {
    rankValue = items ? rank.itemRank : rank.itemlessRank;
    if (duos) {
      rankValue = rank.duosRank;
    }
  }

  rankValue = parseInt(rankValue, 10);

  if (!rankValue) {
    rankValue = DEFAULT_RANK;
  }

  const flag = p.flag ? ` ${p.flag}` : '';
  const tag = `<@${playerId}>${flag}`;
  let { psn } = p;
  if (psn) {
    psn = psn.replace('_', '\\_');
  }
  return [tag, psn, rankValue];
}

async function getEmbed(doc, players, maps, roomChannel) {
  let playersText = 'No players.';
  let psnAndRanks = 'No players.';
  const ranks = [];

  const playersInfo = {};

  const playersOut = [];
  if (players && players.length) {
    const psns = [];
    let i = 0;
    for (const playerId of players) {
      i += 1;

      const [tag, psn, rank] = await getPlayerInfo(playerId, doc.items, doc.duos);

      ranks.push(rank);

      playersOut.push(tag);
      psns.push(`${psn} [${rank}]`);

      playersInfo[playerId] = { tag, psn, rank };
    }
    playersText = playersOut.join('\n');
    psnAndRanks = psns.join('\n');
  }

  console.log(playersInfo);
  if (doc.duos && doc.duosList.length) {
    playersText = '';
    playersText += '**Teams:**\n';
    doc.duosList.forEach((duo, i) => {
      playersText += `${i + 1}.`;
      duo.forEach((player, k) => {
        console.log(player);
        const info = playersInfo[player];
        const tag = info && info.tag;
        playersText += `${k ? '⠀' : ''} ${tag}\n`;
        delete playersInfo[player];
      });
    });
    if (Object.keys(playersInfo).length) {
      playersText += '**Solo Queue:**\n';
      Object.entries(playersInfo).forEach(([key, value]) => {
        playersText += `${value.tag}\n`;
      });
    }
  }

  const sum = ranks.reduce((a, b) => a + b, 0);
  const avgRank = Math.round(sum / ranks.length) || 0;

  let fields;
  let lockedRank;
  if (!doc.locked.$isEmpty()) {
    const playerRank = parseInt(doc.locked.rank, 10);
    const minRank = playerRank - doc.locked.shift;
    const maxRank = playerRank + doc.locked.shift;
    lockedRank = {
      name: 'Rank Locked',
      value: `${minRank} - ${maxRank}`,
      inline: true,
    };
  }

  const iconUrl = doc.duos ? duosIcon : doc.items ? itemsIcon : itemlessIcon;
  const timestamp = doc.started ? doc.startedAt : doc.date;

  if (maps) {
    fields = [
      {
        name: 'Players',
        value: playersText,
        inline: true,
      },
      {
        name: 'PSNs & ranks',
        value: psnAndRanks,
        inline: true,
      },
      {
        name: 'Maps',
        value: maps,
        inline: true,
      },
      {
        name: 'Room',
        value: roomChannel.toString(),
        inline: true,
      },
      {
        name: 'Creator',
        value: `<@${doc.creator}>`,
        inline: true,
      },
      {
        name: 'Average Rank',
        value: avgRank,
        inline: true,
      },
    ];

    if (lockedRank) {
      fields.push(lockedRank);
    }
    return {
      author: {
        name: `${getTitle(doc)} has started`,
        icon_url: iconUrl,
      },
      fields,
      footer: getFooter(doc),
      timestamp,
    };
  }

  if (players) {
    fields = [
      {
        name: 'Players',
        value: playersText,
        inline: true,
      },
      {
        name: 'PSNs & ranks',
        value: psnAndRanks,
        inline: true,
      },
      {
        name: 'Creator',
        value: `<@${doc.creator}>`,
        inline: !!lockedRank,
      },
      {
        name: 'Average Rank',
        value: avgRank,
        inline: true,
      },
    ];

    if (lockedRank) {
      fields.splice(2, 0, lockedRank);
    }

    return {
      author: {
        name: `Gathering ${getTitle(doc)}`,
        icon_url: iconUrl,
      },
      fields,
      footer: getFooter(doc),
      timestamp,
    };
  }

  fields = [{
    name: 'Creator',
    value: `<@${doc.creator}>`,
    inline: true,
  }];

  if (lockedRank) {
    fields.push(lockedRank);
  }

  return {
    author: {
      name: `${getTitle(doc)}`,
      icon_url: iconUrl,
    },
    description: 'React with ✅ to participate',
    fields,
    footer: getFooter(doc),
    timestamp,
  };
}

function findRoom(lobby) {
  // todo findOneAndUpdate
  return Room.findOne({ lobby: null, guild: lobby.guild }).sort({ number: 1 }).then((doc) => {
    if (!doc) {
      return Sequence.findOneAndUpdate(
        { guild: lobby.guild, name: 'rooms' },
        { $inc: { number: 1 } },
        { upsert: true, new: true },
      )
        .then((seq) => {
          const room = new Room();
          room.lobby = lobby.id;
          room.guild = lobby.guild;
          room.number = seq.number;
          return room.save();
        });
    }
    doc.lobby = lobby.id;
    return doc.save();
  });
}

async function findRole(guild, roleName) {
  const roles = await guild.roles.fetch();
  let role = roles.cache.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
  if (!role) {
    role = await guild.roles.create({
      data: { name: roleName, mentionable: true },
      reason: `imagine not having ${roleName} role smh`,
    });
  }
  return role;
}

async function findRoomChannel(guildId, n) {
  const guild = client.guilds.cache.get(guildId);
  const channelName = `ranked-room-${n}`;
  let category = guild.channels.cache.find((c) => c.name.toLowerCase() === 'ranked lobbies' && c.type === 'category');
  if (!category) {
    category = await guild.channels.create('Ranked Lobbies', { type: 'category' });
  }

  let channel = guild.channels.cache.find((c) => c.name === channelName);
  if (!channel) {
    const roleStaff = await findRole(guild, 'Staff');
    const roleRankedStaff = await findRole(guild, 'Ranked Staff');
    const roleRanked = await findRole(guild, 'Ranked Verified');
    const roleRankedItems = await findRole(guild, 'Ranked Items');
    const roleRankedItemless = await findRole(guild, 'Ranked Itemless');

    channel = await guild.channels.create(channelName, {
      type: 'text',
      parent: category,
    });
    channel.createOverwrite(roleStaff, { VIEW_CHANNEL: true });
    channel.createOverwrite(roleRankedStaff, { VIEW_CHANNEL: true });
    channel.createOverwrite(roleRanked, { VIEW_CHANNEL: true });
    channel.createOverwrite(roleRankedItems, { VIEW_CHANNEL: true });
    channel.createOverwrite(roleRankedItemless, { VIEW_CHANNEL: true });
    channel.createOverwrite(guild.roles.everyone, { VIEW_CHANNEL: false });
  }

  return channel;
}

function startLobby(docId) {
  Lobby.findOneAndUpdate({ _id: docId }, { started: true, startedAt: new Date() }, { new: true })
    .then((doc) => {
      client.guilds.cache
        .get(doc.guild).channels.cache
        .get(doc.channel).messages
        .fetch(doc.message).then((message) => {
          rngPoolFFa(doc.items, doc.pools).then((maps) => {
            findRoom(doc).then((room) => {
              findRoomChannel(doc.guild, room.number).then(async (roomChannel) => {
                maps = maps.join('\n');

                const { players } = doc;

                let playersText = '';
                if (doc.duos) {
                  let playersCopy = [...players];
                  if (players.length % 2 !== 0) {
                    throw new Error('Players count is not divisible by 2');
                  }

                  doc.duosList.forEach((duo) => {
                    duo.forEach((player) => {
                      playersCopy = playersCopy.filter((p) => p !== player);
                    });
                  });

                  playersCopy = playersCopy.sort(() => Math.random() - 0.5);

                  const randomDuos = [];
                  for (let i = 0; i < playersCopy.length; i += 1) {
                    const last = randomDuos[randomDuos.length - 1];
                    if (!last || last.length === 2) {
                      randomDuos.push([playersCopy[i]]);
                    } else {
                      last.push(playersCopy[i]);
                    }
                  }

                  doc.duosList = Array.from(doc.duosList).concat(randomDuos);
                  doc = await doc.save();

                  playersText += '**Teams:**\n';
                  doc.duosList.forEach((duo, i) => {
                    playersText += `${i + 1}.`;
                    duo.forEach((player, k) => {
                      playersText += `${k ? '⠀' : ''} <@${player}>\n`;
                    });
                  });
                } else {
                  playersText = players.map((u, i) => `${i + 1}. <@${u}>`).join('\n');
                }

                const playerDocs = await Player.find({ discordId: { $in: players } });

                const [PSNs, templateUrl, template] = await generateTemplateFFA(playerDocs, doc, doc.items ? 8 : 5);

                message.edit({
                  embed: await getEmbed(doc, players, maps, roomChannel),
                });

                // todo add ranks and tags?
                roomChannel.send({
                  content: `**The ${getTitle(doc)} has started**
*Organize your host and scorekeeper*
Your room is ${roomChannel}.
Use \`!lobby end\` when your match is done.
${playersText}`,
                  embed: {
                    fields: [
                      {
                        name: 'Maps',
                        value: maps,
                        inline: true,
                      },
                      {
                        name: 'PSNs',
                        value: PSNs,
                        inline: true,
                      },
                    ],
                  },
                }).then((m) => {
                  roomChannel.messages.fetchPinned().then((pinnedMessages) => {
                    pinnedMessages.forEach((pinnedMessage) => pinnedMessage.unpin());
                    m.pin();
                  });

                  roomChannel.send({
                    embed: {
                      title: 'Scores Template',
                      description: `\`\`\`${template}\`\`\`
[Open template on gb.hlorenzi.com](${templateUrl})`,
                    },
                  });

                  if (maps.includes('Tiger Temple')) {
                    roomChannel.send('Remember: Tiger Temple shortcut is banned! <:feelsbanman:649075198997561356>');
                  }
                });
              });
            });
          });
        });
    });
}

function diffMinutes(dt2, dt1) {
  let diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
}

function confirmLobbyStart(doc, message, override = false) {
  const minutes = diffMinutes(new Date(), doc.date);

  if (doc.started) {
    return message.channel.send('Lobby has already been started.');
  }

  if (!override && minutes < 15) {
    return message.channel.send(`You need to wait at least ${15 - minutes} more minutes to force start the lobby.`);
  }

  const playersCount = doc.players.length;
  if (!override && doc.items && playersCount < 6) {
    return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot start item lobby with less than 6 players.`);
  }

  if (doc.duos && playersCount % 2 !== 0) {
    return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot start Duos lobby with player count not divisible by 2.`);
  }

  if (!override && !doc.items && playersCount < 4) {
    return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot start itemless lobby with less than 4 players.`);
  }

  return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players. Are you sure you want to start it? Say \`yes\` or \`no\`.`)
    .then(() => {
      message.channel
        .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
        .then((collected) => {
          const { content } = collected.first();
          if (content.toLowerCase() === 'yes') {
            if (doc.started) {
              return message.channel.send('Lobby has already been started.');
            }
            message.channel.send('Generating maps...').then((m) => m.delete({ timeout: 3000 }));
            startLobby(doc.id);
          } else {
            throw Error('cancel');
          }
        })
        .catch(() => message.channel.send('Command cancelled.'));
    });
}

function findLobby(lobbyID, isStaff, message, callback) {
  if (lobbyID) {
    let promise;

    if (isStaff) {
      promise = Lobby.findOne({ _id: lobbyID });
    } else {
      promise = Lobby.findOne({
        $or: [
          { _id: lobbyID, creator: message.author.id },
          { _id: lobbyID, started: true, players: message.author.id },
        ],
      });
    }

    promise.then((doc) => {
      if (!doc) {
        if (isStaff) {
          return message.channel.send('There is no lobby with this ID.');
        }
        return message.channel.send('You don\'t have lobby with this ID.');
      }
      return callback(doc, message);
    });
  } else {
    Lobby.find({
      $or: [
        { creator: message.author.id },
        { started: true, players: message.author.id },
      ],
    }).then((docs) => {
      docs = docs.filter((doc) => {
        const guild = client.guilds.cache.get(doc.guild);
        if (!guild) {
          doc.delete();
          return false;
        }
        const channel = guild.channels.cache.get(doc.channel);
        if (!channel) {
          doc.delete();
          return false;
        }
        const docMessage = channel.messages.cache.get(doc.message);
        if (!docMessage) {
          doc.delete();
          return false;
        }
        return true;
      });

      if (!docs.length) {
        return message.channel.send('You don\'t have any active lobbies!');
      }

      if (docs.length === 1) {
        const doc = docs.shift();
        return callback(doc, message);
      }

      if (docs.length > 1) {
        const lobbies = docs.map((d) => `\`${d.id}\` created by <@${d.creator}>`).join('\n');
        return message.channel.send('...')
          .then((m) => m.edit(`You have more than 1 active lobby. You should specify the ID.\n${lobbies}`));
      }
    });
  }
}

function deleteLobby(doc, msg) {
  const promiseMessageDelete = client.guilds.cache.get(doc.guild)
    .channels.cache.get(doc.channel)
    .messages.fetch(doc.message)
    .then((m) => m.delete());
  let endMessage = 'Lobby ended.';

  if (doc.started) {
    endMessage += ' Don\'t forget to submit your scores.';
  }

  const roomDocDelete = Room.findOne({ lobby: doc.id }).then((room) => {
    if (!room) {
      return;
    }
    const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
    if (msg && channel && msg.channel.id !== channel.id) {
      channel.send(endMessage);
    }

    room.lobby = null;
    room.save();
  });
  const promiseDocDelete = doc.delete();

  Promise.all([promiseMessageDelete, promiseDocDelete, roomDocDelete]).then(() => {
    if (msg) msg.channel.send(endMessage);
  });
}

module.exports = {
  name: 'lobby',
  description: 'Ranked lobbies',
  guildOnly: true,
  aliases: ['mogi', 'l'],
  async execute(message, args) {
    let action = args[0];

    if (!action) {
      action = 'new';
    }

    const lobbyID = args[1];

    const { member } = message;

    const now = moment();
    // if (moment('2020-07-18 05:00') <= now) {
    //   return message.channel.send('Lobbies are temporarily closed.');
    // }

    const { guild } = message;
    const { user } = member;

    const banned = await RankedBan.findOne({ discordId: user.id, guildId: guild.id });
    if (banned) {
      return message.reply('you are currently banned from ranked FFAs.');
    }

    const player = await Player.findOne({ discordId: user.id });
    if (!player || !player.psn) {
      return message.reply('set your PSN first with `!set_psn`.');
    }

    const isStaff = member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);

    const hasRankedRole = member.roles.cache.find((r) => r.name.toLowerCase() === 'ranked verified');

    if (!isStaff && !hasRankedRole) {
      return message.channel.send('You don\'t have a ranked verified role to execute this command');
    }

    if (message.channel.parent && message.channel.parent.name.toLowerCase() !== 'ranked lobbies') {
      return message.reply('you can use this command only in Ranked Lobbies category.');
    }

    switch (action && action.toLowerCase()) {
      case 'new':
        // eslint-disable-next-line no-case-declarations
        const creatorsLobby = await Lobby.findOne({ creator: message.author.id });
        if (creatorsLobby && !isStaff) {
          return message.reply('you have already created a lobby.');
        }

        const cooldown = await Cooldown.findOne({ guildId: guild.id, discordId: message.author.id, name: 'lobby' });
        if (!isStaff && cooldown && cooldown.count >= 1) {
          const updatedAt = moment(cooldown.updatedAt);
          updatedAt.add(30, 'm');
          const wait = moment.duration(now.diff(updatedAt));
          return message.reply(`you cannot create lobbies so often. You have to wait ${wait.humanize()}.`);
        }

        message.channel.send(`Select lobby mode. Waiting 1 minute.
0 - Itemless (pools)
1 - Items (pools)
2 - Itemless (full rng)
3 - Items (full rng)
4 - Duos (pools)
5 - Duos (full rng)`).then((confirmMessage) => {
          message.channel.awaitMessages((m) => m.author.id === message.author.id, {
            max: 1,
            time: 60000,
            errors: ['time'],
          })
            .then(async (collected) => {
              const collectedMessage = collected.first();
              const { content } = collectedMessage;
              collectedMessage.delete();
              if (['0', '1', '2', '3', '4', '5'].includes(content)) {
                const items = ['1', '3', '4', '5'].includes(content);
                const duos = ['4', '5'].includes(content);

                const sameTypeLobby = await Lobby.findOne({
                  duos, items, started: false, guild: message.guild.id,
                });

                if (sameTypeLobby) {
                  confirmMessage.edit('There is already lobby of this type, are you sure you want to create a new one? (yes/no)');
                  const response = await message.channel
                    .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
                    .then((collected) => {
                      const message1 = collected.first();
                      const { content } = message1;
                      message1.delete();
                      return content.toLowerCase() === 'yes';
                    })
                    .catch(() => false);
                  if (!response) {
                    throw new Error('cancel');
                  }
                }

                const fromPools = ['0', '1', '4'].includes(content);

                const roleName = `ranked ${duos ? 'duos' : items ? 'items' : 'itemless'}`;
                let role = guild.roles.cache.find((r) => r.name.toLowerCase() === roleName);
                if (!role) {
                  role = await guild.roles.create({
                    data: { name: roleName, mentionable: true },
                    reason: `imagine not having ${roleName} role smh`,
                  });
                }

                const cooldownDoc = await Cooldown.findOneAndUpdate(
                  { guildId: guild.id, discordId: message.author.id, name: 'lobby' },
                  { $inc: { count: 1 }, $set: { updatedAt: now } },
                  { upsert: true, new: true },
                );

                const lobby = new Lobby();
                lobby.guild = guild.id;
                lobby.creator = message.author.id;
                lobby.items = items;
                lobby.duos = duos;
                lobby.pools = fromPools;
                lobby.save().then(async (doc) => {
                  guild.channels.cache.find((c) => c.name === 'ranked-lobbies')
                    .send({
                      content: role,
                      embed: await getEmbed(doc),
                    }).then((m) => {
                      doc.channel = m.channel.id;
                      doc.message = m.id;
                      doc.save().then(() => {
                        m.react('✅');
                        confirmMessage.edit(`${getTitle(doc)} has been created. Don't forget to press ✅.`);
                      });
                    });
                });
              } else {
                throw new Error('cancel');
              }
            })
            .catch(() => confirmMessage.edit('Command cancelled.').then((m) => m.delete({ timeout: 5000 })));
        });

        break;
      case 'locked':
        message.channel.send(`Select lobby mode. Waiting 1 minute.
0 - Items (pools)
1 - Items (full rng)`).then((confirmMessage) => {
          message.channel.awaitMessages((m) => m.author.id === message.author.id, {
            max: 1,
            time: 60000,
            errors: ['time'],
          })
            .then(async (collected) => {
              const collectedMessage = collected.first();
              const { content } = collectedMessage;
              collectedMessage.delete();
              if (['0', '1'].includes(content)) {
                const items = true;
                const fromPools = content === '0';

                const diffMin = 200;
                const diffMax = 500;
                const diffDefault = 350;

                confirmMessage.edit(`Select allowed rank difference. Waiting 1 minute.
The value should be in range: \`${diffMin} - ${diffMax}\`. Defaults to \`${diffDefault}\` on any other input.`).then((confirmMessage2) => {
                  message.channel.awaitMessages((m) => m.author.id === message.author.id, {
                    max: 1,
                    time: 60000,
                    errors: ['time'],
                  })
                    .then(async (collected2) => {
                      const collectedMessage2 = collected2.first();
                      let rankDiff = parseInt(collectedMessage2.content, 10);

                      if (Number.isNaN(rankDiff) || rankDiff < diffMin || rankDiff > diffMax) {
                        rankDiff = diffDefault;
                      }

                      const rank = await Rank.findOne({ name: player.psn });
                      let playerRank = PLAYER_DEFAULT_RANK;
                      if (rank) {
                        playerRank = items ? rank.itemRank : rank.itemlessRank;
                      }

                      collectedMessage2.delete();

                      const roleName = `ranked ${items ? 'items' : 'itemless'}`;
                      let role = guild.roles.cache.find((r) => r.name.toLowerCase() === roleName);
                      if (!role) {
                        role = await guild.roles.create({
                          data: { name: roleName, mentionable: true },
                          reason: `imagine not having ${roleName} role smh`,
                        });
                      }

                      const lobby = new Lobby();
                      lobby.guild = guild.id;
                      lobby.creator = message.author.id;
                      lobby.items = items;
                      lobby.pools = fromPools;
                      lobby.locked = {
                        rank: playerRank,
                        shift: rankDiff,
                      };
                      lobby.save().then(async (doc) => {
                        guild.channels.cache.find((c) => c.name === 'ranked-lobbies')
                          .send({
                            content: role,
                            embed: await getEmbed(doc),
                          }).then((m) => {
                            doc.channel = m.channel.id;
                            doc.message = m.id;
                            doc.save().then(() => {
                              m.react('✅');
                              confirmMessage2.edit(`${getTitle(doc)} has been created. Don't forget to press ✅.`);
                            });
                          });
                      });
                    })
                    .catch(() => confirmMessage2.edit('Command cancelled.').then((m) => m.delete({ timeout: 5000 })));
                });
              } else {
                throw new Error('cancel');
              }
            })
            .catch(() => confirmMessage.edit('Command cancelled.').then((m) => m.delete({ timeout: 5000 })));
        });

        break;

      case 'start':
      case 'begin':
        findLobby(lobbyID, isStaff, message, confirmLobbyStart);
        break;

      case 'override':
        if (isStaff) {
          findLobby(lobbyID, isStaff, message, (d, m) => confirmLobbyStart(d, m, true));
        } else {
          return message.channel.send('You don\'t have permissions to do that.');
        }
        break;
      case 'delete':
      case 'remove':
      case 'done':
      case 'stop':
      case 'end':
      case 'die':
      case 'fuck':
        findLobby(lobbyID, isStaff, message, (doc, msg) => {
          if (doc.started) {
            const minutes = diffMinutes(new Date(), doc.startedAt);
            if ((doc.items && minutes < 50) || (!doc.items && minutes < 30)) {
              Room.findOne({ lobby: doc.id }).then((room) => {
                if (!room) {
                  return deleteLobby(doc, msg);
                }

                const roomChannel = message.guild.channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
                if (roomChannel) {
                  const pings = doc.players.map((p) => `<@${p}>`).join(' ');
                  roomChannel.send(`I need reactions from 2 other people in the lobby to confirm.\n${pings}`).then((voteMessage) => {
                    voteMessage.react('✅');

                    const filter = (r, u) => ['✅'].includes(r.emoji.name) && doc.players.includes(u.id) && u.id !== message.author.id;
                    voteMessage.awaitReactions(filter, { max: 2, time: 60000, errors: ['time'] })
                      .then((collected) => {
                        deleteLobby(doc, msg);
                      })
                      .catch(() => {
                        voteMessage.channel.send('Command cancelled.');
                      });
                  });
                }
              });
            } else {
              deleteLobby(doc, msg);
            }
          } else {
            return deleteLobby(doc, msg);
          }
        });
        break;
    }
  },
};

const banDuration = moment.duration(1, 'hour');

// todo rewrite with Cooldown model
async function tickCount(reaction, user) {
  const { guild } = reaction.message;

  const member = await guild.members.fetch(user.id);
  const isStaff = member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);
  if (isStaff) return;

  const now = new Date();
  Counter.findOneAndUpdate(
    { guildId: guild.id, discordId: user.id },
    { $inc: { tickCount: 1 }, $set: { tickUpdatedAt: now } },
    { upsert: true, new: true },
  )
    .then((doc) => {
      if (doc.tickCount === 7) { // ban
        reaction.users.remove(user);

        const bannedTill = moment().add(banDuration);
        RankedBan.findOneAndUpdate(
          { guildId: guild.id, discordId: user.id },
          { bannedAt: now, bannedTill },
          { upsert: true },
        ).exec();

        const lobbiesChannel = guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
        lobbiesChannel.createOverwrite(user, { VIEW_CHANNEL: false });

        const generalChannel = guild.channels.cache.find((c) => c.name === 'ranked-general');
        const message = `${user}, you've been banned from ranked FFAs for ${banDuration.humanize()}.`;
        user.createDM().then((dm) => dm.send(message));
        generalChannel.send(message);
      } else if (doc.tickCount === 3 || doc.tickCount === 5) {
        const channel = guild.channels.cache.find((c) => c.name === 'ranked-general');
        const message = `${user}, I will ban you from ranked FFAs for ${banDuration.humanize()} if you will continue to spam reactions.`;
        user.createDM().then((dm) => dm.send(message));
        channel.send(message);
      }
    });
}

const ITEMS_MAX = 8;
const ITEMLESS_MAX = 4;

async function mogi(reaction, user, removed = false) {
  if (user.id === client.user.id) {
    return;
  }

  const { message } = reaction;
  if (message.author.id === client.user.id) {
    const conditions = {
      guild: message.guild.id,
      channel: message.channel.id,
      message: message.id,
      started: false,
      closed: false,
    };

    const { guild } = message;

    let rankedGeneral = guild.channels.cache.find((c) => c.name === 'ranked-general');
    if (!rankedGeneral) {
      rankedGeneral = await guild.channels.create('ranked-general');
    }

    Lobby.findOne(conditions).then(async (doc) => {
      if (doc) {
        if (!removed) {
          tickCount(reaction, user);

          const member = await guild.members.fetch(user.id);
          if (!member) return;

          let errorMsg;

          const banned = await RankedBan.findOne({ discordId: member.id, guildId: guild.id });
          if (banned) {
            reaction.users.remove(user);
            const lobbiesChannel = guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
            lobbiesChannel.createOverwrite(user, { VIEW_CHANNEL: false });
            errorMsg = `${user}, you cannot join the lobbies, because you're banned.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          if (member.roles.cache.find((r) => r.name.toLowerCase() === 'muted')) {
            reaction.users.remove(user);
            errorMsg = `${user}, you cannot join the lobbies, because you're muted.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          const player = await Player.findOne({ discordId: user.id });
          if (!player || !player.psn) {
            reaction.users.remove(user);
            errorMsg = `${user}, you need to set your PSN before you will be able to join lobbies. Example: \`!set_psn ctr_tourney_bot\`.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          const repeatLobby = await Lobby.findOne({ guild: guild.id, players: user.id, _id: { $ne: doc._id } });

          if (repeatLobby) {
            reaction.users.remove(user);
            errorMsg = `${user}, you cannot be in 2 lobbies at the same time.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          if (!doc.locked.$isEmpty()) {
            const rank = await Rank.findOne({ name: player.psn });

            let playerRank = PLAYER_DEFAULT_RANK;
            if (rank) {
              playerRank = doc.items ? rank.itemRank : rank.itemlessRank;
            }
            const lockedRank = parseInt(doc.locked.rank, 10);
            const minRank = lockedRank - doc.locked.shift;
            const maxRank = lockedRank + doc.locked.shift;
            const rankTooLow = playerRank < minRank;
            const rankTooHigh = playerRank > maxRank;
            if (rankTooLow || rankTooHigh) {
              reaction.users.remove(user);
              errorMsg = `${user}, you cannot join this lobby. ${rankTooLow ? 'Your rank is too low.' : 'Your rank is too high.'}`;
              user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
              return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
            }
          }
        }

        lock.acquire(doc._id, async () => Lobby.findOne({ _id: doc._id }).then(async (doc) => {
          console.log(`lock acquire ${doc._id}`);
          let players = Array.from(doc.players);

          const playersCount = players.length;
          if (!removed && ((doc.items && playersCount >= ITEMS_MAX) || (!doc.items && playersCount >= ITEMLESS_MAX))) {
            return;
          }

          let duosList = Array.from(doc.duosList);
          const { duos } = doc;

          if (duos) {
            const userSavedDuo = await Duo.findOne({
              guild: guild.id,
              $or: [{ discord1: user.id }, { discord2: user.id }],
            });
            if (userSavedDuo) {
              const savedPartner = userSavedDuo.discord1 === user.id ? userSavedDuo.discord2 : userSavedDuo.discord1;

              if (removed) {
                players = players.filter((p) => p !== user.id && p !== savedPartner);
                duosList = duosList.filter((p) => !(Array.isArray(p) && p.includes(user.id)));
              } else {
                const repeatLobbyPartner = await Lobby.findOne({ guild: guild.id, players: savedPartner, _id: { $ne: doc._id } });

                if (repeatLobbyPartner) {
                  reaction.users.remove(user);
                  const errorMsg = `${user}, your partner is in another lobby.`;
                  user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                  return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                }

                const partnerBanned = await RankedBan.findOne({ discordId: savedPartner, guildId: guild.id });
                if (partnerBanned) {
                  reaction.users.remove(user);
                  userSavedDuo.delete();
                  const errorMsg = `${user}, your partner is banned, duo has been deleted.`;
                  user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                  rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                  return;
                }
                // if (playersCount > ITEMS_MAX - 2) {
                //   reaction.users.remove(user);
                //   const error = `${user}, there are already ${playersCount} people the lobby - you cannot join this lobby while you have a partner set.`;
                //   user.createDM().then((dmChannel) => dmChannel.send(error));
                //   rankedGeneral.send(error).then((m) => m.delete({ timeout: 60000 }));
                //   return;
                // }
                if (playersCount === ITEMS_MAX - 1) {
                  const soloQueue = players.filter((p) => !doc.duosList.flat().includes(p));
                  const lastSoloQueuePlayer = soloQueue.pop();
                  players = players.filter((p) => p !== lastSoloQueuePlayer);
                }

                if (!players.includes(user.id) && !players.includes(savedPartner)) {
                  const duo = [user.id, savedPartner];
                  players.push(...duo);
                  duosList.push(duo);
                }
              }
            } else if (removed) {
              players = players.filter((p) => p !== user.id);
            } else if (!players.includes(user.id)) {
              players.push(user.id);
            }
          } else if (removed) {
            players = players.filter((p) => p !== user.id);
          } else if (!players.includes(user.id)) {
            players.push(user.id);
          }

          doc.players = players;

          if (duos) {
            doc.duosList = duosList;
          }

          return doc.save().then(async (newDoc) => {
            const count = players.length;
            if (count) {
              if ((doc.items && count === ITEMS_MAX) || (!doc.items && count === ITEMLESS_MAX)) {
                startLobby(doc.id);
              } else {
                message.edit({
                  embed: await getEmbed(doc, players),
                });
              }
            } else {
              message.edit({
                embed: await getEmbed(doc),
              });
            }
            console.log('done');
          }).catch(console.error);
        })).then(() => {
          console.log(`lock released ${doc._id}`);
        });
      }
    });
  }
}

client.on('messageReactionAdd', async (reaction, user) => {
  // When we receive a reaction we check if the reaction is partial or not
  if (reaction.partial) {
    // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
    try {
      await reaction.fetch();
      await reaction.users.fetch();
    } catch (error) {
      console.log('Something went wrong when fetching the message: ', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }

  mogi(reaction, user);
});

client.on('messageReactionRemove', async (reaction, user) => {
  // When we receive a reaction we check if the reaction is partial or not
  if (reaction.partial) {
    // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
    try {
      await reaction.fetch();
    } catch (error) {
      console.log('Something went wrong when fetching the message: ', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }
  mogi(reaction, user, true);

  // // Now the message has been cached and is fully available
  // console.log(`${reaction.message.author}'s message "${reaction.message.content}" removed a reaction!`);
  // // The reaction is now also fully available and the properties will be reflected accurately:
  // console.log(`${reaction.count} user(s) have given the same reaction to this message!`);
});

client.on('messageDelete', async (message) => {
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      console.log('Something went wrong when fetching the message: ', error);
    }
  }

  const conditions = {
    // guild: message.guild.id,
    // channel: message.channel.id,
    message: message.id,
  };

  Lobby.findOne(conditions).then(async (doc) => {
    if (doc) {
      Room.findOne({ lobby: doc.id }).then((room) => {
        if (!room) {
          return;
        }
        const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
        if (channel && message.channel.id !== channel.id) {
          channel.send('Lobby ended. Don\'t forget to submit your scores.');
        }

        room.lobby = null;
        room.save();
      });
      doc.delete();
    }
  });
});

const findRoomAndSendMessage = (doc, ping = false) => {
  let message = 'Don\'t forget to close the lobby with `!lobby end` and submit your scores.';

  if (ping) {
    message += `\n${doc.players.map((p) => `<@${p}>`).join(' ')}`;
  }

  Room.findOne({ lobby: doc.id }).then((room) => {
    if (room) {
      const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
      if (channel) {
        channel.send(message);
      }
    }
  });
};

const checkOldLobbies = () => {
  Lobby.find({ started: true }).then((docs) => {
    docs.forEach((doc) => {
      const minutes = diffMinutes(new Date(), doc.startedAt);

      const remindMinutes = doc.items ? [45, 60] : [30, 45];
      const pingMinutes = doc.items ? [75, 90, 105, 120] : [60, 75, 90, 105, 120];

      if (remindMinutes.includes(minutes)) {
        findRoomAndSendMessage(doc);
      } else if (pingMinutes.includes(minutes)) {
        findRoomAndSendMessage(doc, true);
      }
    });
  });

  Lobby.find({ started: false }).then((docs) => {
    docs.forEach(async (doc) => {
      const minutes = diffMinutes(new Date(), doc.date);

      const remindMinutes = [55];

      const CLOSE_MINUTES = 60;

      if (remindMinutes.includes(minutes) || minutes >= CLOSE_MINUTES) {
        const guild = client.guilds.cache.get(doc.guild);
        let channel = guild.channels.cache.find((c) => c.name === 'ranked-general');
        if (!channel) {
          channel = await guild.channels.create('ranked-general');
        }
        const creatorMember = `<@${doc.creator}>`;

        if (minutes >= CLOSE_MINUTES) {
          const duration = moment.duration(CLOSE_MINUTES, 'minutes').humanize();
          deleteLobby(doc);
          channel.send(`${creatorMember}, your lobby \`${doc.id}\` has been deleted because it wasn't started in ${duration}.`);
        } else {
          const duration = moment.duration(CLOSE_MINUTES - minutes, 'minutes').humanize();
          channel.send(`${creatorMember}, your lobby \`${doc.id}\` will be deleted in ${duration} if it will not be started.`);
        }
      }
    });
  });
};

new CronJob('* * * * *', checkOldLobbies).start();

function checkRankedBans() {
  const now = new Date();
  RankedBan.find({ bannedTill: { $lte: now } }).then((docs) => {
    docs.forEach((doc) => {
      const channel = client.guilds.cache.get(doc.guildId).channels.cache.find((c) => c.name === 'ranked-lobbies');
      const permissionOverwrites = channel.permissionOverwrites.get(doc.discordId);
      if (permissionOverwrites) {
        permissionOverwrites.delete().then(() => {
          console.log(doc.discordId, 'unbanned');
        });
      }
      doc.delete();
    });
  });
}

function resetCounters() {
  const oneMinuteAgo = moment().subtract(1, 'm');
  Counter.find({ tickUpdatedAt: { $lte: oneMinuteAgo }, tickCount: { $gt: 0 } })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.tickCount = 0;
        doc.save();
      });
    });

  const duration = moment().subtract(3, 'h');
  Counter.find({ pingUpdatedAt: { $lte: duration }, pingCount: { $gt: 0 } })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.pingCount = 0;
        doc.save();
      });
    });

  checkRankedBans();
}

new CronJob('* * * * *', resetCounters).start();

const correctSums = {
  4: 55,
  6: 176,
  7: 248,
  8: 312,
};

function checkScoresSum(message) {
  let text = message.content;

  const match = text.match(/`([^`]+)`/);
  if (match) {
    text = match[1];
  }

  const data = parseData(text);

  if (data) {
    const { players } = data.clans[0];
    const sum = players.reduce((s, p) => s + p.totalScore, 0);

    const correctSum = correctSums[players.length];
    if (correctSum && sum !== correctSum) {
      if (sum > correctSum) {
        message.reply(`the total number of points for your lobby is over ${correctSum} points.
If there were 1 or multiple ties in your lobby, you can ignore this message. If not, please double check the results.`);
      } else {
        message.reply(`the total number of points for your lobby is under ${correctSum} points.
Unless somebody left the lobby before all races were played or was penalized, please double check the results.`);
      }
    }
  }
}

function resetCooldowns() {
  const onHourAgo = moment().subtract(1, 'h');
  Cooldown.find({ updatedAt: { $lte: onHourAgo }, count: { $gt: 0 }, name: 'pings' })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.count = 0;
        doc.save();
      });
    });

  const duration = moment().subtract(3, 'h');
  Cooldown.find({ updatedAt: { $lte: duration }, count: { $gt: 0 }, name: 'ranked pings' })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.count = 0;
        doc.save();
      });
    });

  const thirtyMinutes = moment().subtract(30, 'm');
  Cooldown.find({ updatedAt: { $lte: thirtyMinutes }, count: { $gt: 0 }, name: 'lobby' })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.count = 0;
        doc.save();
      });
    });
}

new CronJob('* * * * *', resetCooldowns).start();

client.on('message', (message) => {
  if (message.author.bot) return;
  if (message.channel.type !== 'text') return;

  const { member } = message;
  const isStaff = member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);

  // check sumbissions
  if (message.channel.name === 'results-submissions') {
    if (!isStaff && !message.content.includes('`') && message.content.includes('|')) {
      const s = `please put scores inside triple grave accent: \\\`\`\`PUT_SCORES_HERE\\\`\`\`
It will prevent Discord from applying styling when people have underscores in their PSN.
The scores will look like this:`;
      message.reply(`\`\`\`${message.content}\`\`\``).then(() => {
        message.delete();
      });
    }

    checkScoresSum(message);
  }

  if (isStaff) return;

  const { roles } = message.mentions;

  if (message.channel.parent && message.channel.parent.name.toLowerCase() === 'ranked lobbies' && roles.find((r) => r.name.toLowerCase() === 'tournament staff')) {
    let rankedStaff = '@Ranked Staff';

    message.channel.send(`${message.author}, incorrect staff ping. If you have a problem ping ${rankedStaff}.`).then((m) => {
      const rankedStaffRole = message.guild.roles.cache.find((r) => r.name.toLowerCase() === 'ranked staff');
      if (rankedStaffRole) {
        rankedStaff = rankedStaffRole.toString();
        m.edit(`${message.author}, incorrect staff ping. If you have a problem ping ${rankedStaff}.`);
      }
    });
  }
});

client.on('ready', () => {
  // todo fetch downtime reactions?

  Lobby.find().then((docs) => {
    docs.forEach(async (doc) => {
      const guild = client.guilds.cache.get(doc.guild);
      if (!guild) {
        doc.delete();
      }
      const channel = guild.channels.cache.get(doc.channel);
      if (!channel) {
        doc.delete();
      }
      channel.messages.fetch(doc.message).catch(() => {
        doc.delete();
      });
    });
  });
});

// update cached ranks
async function getRanks() {
  const url = 'https://gb.hlorenzi.com/api/v1/graphql';
  const items = 'iwkwkl';
  const itemless = 'Rt4eY_';
  const duos = 'HzYdL_';

  const itemsResponse = await axios.post(url, `{
  team(teamId: "${items}")
    {
      id, kind, name, tag, iconSrc, flag, gamePreset, ownerIds, updaterIds, createDate, modifyDate, activityDate, wins, draws, losses, baseWins, baseDraws, baseLosses, ratingScheme, ratingMin, tiers { name, lowerBound, color }, ratingElo { initial, scalingFactors }, ratingMk8dxMmr { initial, scalingFactors, baselines }, matchCount, playerCount,
      players { name, ranking, maxRanking, minRanking, wins, losses, playedMatchCount, firstActivityDate, lastActivityDate, rating, ratingGain, maxRating, minRating, maxRatingGain, maxRatingLoss, points, maxPointsGain }
    }
}`, {
    headers: { 'Content-Type': 'text/plain' },
  });

  const itemlessResponse = await axios.post(url, `{
  team(teamId: "${itemless}")
    {
      id, kind, name, tag, iconSrc, flag, gamePreset, ownerIds, updaterIds, createDate, modifyDate, activityDate, wins, draws, losses, baseWins, baseDraws, baseLosses, ratingScheme, ratingMin, tiers { name, lowerBound, color }, ratingElo { initial, scalingFactors }, ratingMk8dxMmr { initial, scalingFactors, baselines }, matchCount, playerCount,
      players { name, ranking, maxRanking, minRanking, wins, losses, playedMatchCount, firstActivityDate, lastActivityDate, rating, ratingGain, maxRating, minRating, maxRatingGain, maxRatingLoss, points, maxPointsGain }
    }
}`, {
    headers: { 'Content-Type': 'text/plain' },
  });

  const duosResponse = await axios.post(url, `{
  team(teamId: "${duos}")
    {
      id, kind, name, tag, iconSrc, flag, gamePreset, ownerIds, updaterIds, createDate, modifyDate, activityDate, wins, draws, losses, baseWins, baseDraws, baseLosses, ratingScheme, ratingMin, tiers { name, lowerBound, color }, ratingElo { initial, scalingFactors }, ratingMk8dxMmr { initial, scalingFactors, baselines }, matchCount, playerCount,
      players { name, ranking, maxRanking, minRanking, wins, losses, playedMatchCount, firstActivityDate, lastActivityDate, rating, ratingGain, maxRating, minRating, maxRatingGain, maxRatingLoss, points, maxPointsGain }
    }
}`, {
    headers: { 'Content-Type': 'text/plain' },
  });

  const players = {};

  const itemsPlayers = itemsResponse.data.data.team.players;
  itemsPlayers.forEach((p) => {
    const { name } = p;
    if (!(name in players)) {
      players[name] = { name };
    }
    players[name].itemRank = p.rating;
    players[name].itemPosition = p.ranking;
  });

  const itemlessPlayers = itemlessResponse.data.data.team.players;
  itemlessPlayers.forEach((p) => {
    const { name } = p;
    if (!(name in players)) {
      players[name] = { name };
    }
    players[name].itemlessRank = p.rating;
    players[name].itemlessPosition = p.ranking;
  });

  const duosPlayers = duosResponse.data.data.team.players;
  duosPlayers.forEach((p) => {
    const { name } = p;
    if (!(name in players)) {
      players[name] = { name };
    }
    players[name].duosRank = p.rating;
    players[name].duosPosition = p.ranking;
  });

  await Rank.deleteMany();
  await Rank.insertMany(Object.values(players));
}

new CronJob('0/15 * * * *', getRanks).start();

// check bans on rejoin
client.on('guildMemberAdd', (member) => {
  const { guild } = member;
  const { user } = member;

  const now = new Date();

  RankedBan.findOne({ discordId: user.id, guildId: guild.id, bannedTill: { $gte: now } }).then((doc) => {
    if (doc) {
      const lobbiesChannel = guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
      lobbiesChannel.createOverwrite(user, { VIEW_CHANNEL: false }).then(() => {
        console.log(user.id, 'banned from ranked on rejoin');
        sendLogMessage(guild, `<@${user.id}> ranked banned on rejoin`);
      });
    }
  });
});

// new role
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const DMCallback = (m) => {
    const logMessage = `Sent message to ${m.channel.recipient}:\n\`\`\`${m.content}\`\`\``;
    sendLogMessage(newMember.guild, logMessage);
  };

  const DMCatchCallback = (error) => {
    const logMessage = `Ranked role: ${error.message} ${newMember}`;
    sendLogMessage(newMember.guild, logMessage);
  };

  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  if (oldRoles.some((r) => r.name.toLowerCase() === 'ranked verified')) {
    return;
  }

  if (!oldRoles.some((r) => r.name.toLowerCase() === 'ranked') && newRoles.some((r) => r.name.toLowerCase() === 'ranked')) {
    newMember.createDM().then((dm) => {
      dm.send(config.ranked_welcome).then(DMCallback).catch(DMCatchCallback);
    });
  }

  if (newRoles.some((r) => r.name.toLowerCase() === 'ranked verified')) {
    const { guild } = newMember;
    let channel = guild.channels.cache.find((c) => c.name.toLowerCase() === 'ranked-general');
    if (!channel) {
      channel = await guild.channels.create('ranked-general');
    }
    let rankedRules = '#ranked-rules';

    const rankedRulesChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === 'ranked-rules');
    if (rankedRulesChannel) {
      rankedRules = rankedRulesChannel.toString();
    }

    let rankedGuide = '#ranked-guide';

    const rankedGuideChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === 'ranked-guide');
    if (rankedGuideChannel) {
      rankedGuide = rankedGuideChannel.toString();
    }

    Player.findOne({ discordId: newMember.id }).then((doc) => {
      if (!doc || !doc.psn) {
        channel.send(`${newMember}, welcome to the Ranked Lobbies.
Make sure to read the ${rankedRules} and ${rankedGuide} and set your PSN via command: \`!set_psn\` before you can join any lobbies.`);
      }
    });
  }
});

const duoDuration = moment.duration(3, 'hours');

function checkOldDuos() {
  console.log('checkOldDuos');
  const lte = moment().subtract(duoDuration);
  Duo.find({ date: { $lte: lte } })
    .then((duos) => {
      duos.forEach((duo) => {
        Lobby.findOne({
          duos: true,
          players: { $in: [duo.discord1, duo.discord2] },
        }).then((activeLobby) => {
          if (!activeLobby) {
            duo.delete().then(() => {
              const guild = client.guilds.cache.get(duo.guild);
              const generalChannel = guild.channels.cache.find((c) => c.name === 'ranked-general');
              const message = `Duo <@${duo.discord1}> & <@${duo.discord2}> was removed after ${duoDuration.humanize()}.`;
              generalChannel.send(message);
            });
          }
        });
      });
    });
}

new CronJob('* * * * *', checkOldDuos).start();
