const escapeRegExp = require('lodash.escaperegexp');
const Mute = require('../db/models/mutes');

function sendFunnyMessage(message, output) {
  message.channel.startTyping();
  const msg = typeof output === 'function' ? output() : output;
  console.log('fun:', msg);
  message.channel.send(`${msg}`).then((sentMessage) => {
    sentMessage.channel.stopTyping(true);
  });
}

async function sendReaction(message, output) {
  // message.channel.startTyping();
  const reaction = typeof output === 'function' ? output() : output;
  console.log('fun:', reaction.toString());

  let reactions = reaction;
  if (!Array.isArray(reactions)) {
    reactions = [reactions];
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const r of reactions) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await message.react(r);
    } catch (e) {
      console.log(e);
    }
  }
  // message.channel.stopTyping(true);
}

async function fun(message) {
  if (['signups', 'announcements', 'tournaments'].includes(message.channel.name)) return;

  const { client } = message;

  // noinspection NonAsciiCharacters
  const messagesStartsWith = {
    imagine: { react: ['🇦', '🇭', '🇾', '🇪', '🇸'] },
    'ah yes': 'imagine',

    'good bot': () => (Math.random() > 0.5 ? 'Yes, I am :robot:' : 'Good human'),

    yaya: () => client.getEmote('yaya'),
    booblis: () => client.getEmote('blooblis'),

    // clans
    gsc: { react: () => client.getEmote('lulwheel') },
    rc: { react: () => client.getEmote('RC') },

    'super engine': { react: () => client.getEmote('feelsrageman') },
    ping: { react: () => client.getEmote('pingwoah') },

    free: { react: ['🆓', '🤡'] },

    rules: () => {
      const feelsbanman = client.getEmote('feelsbanman');
      return `Who is not reading the rules? ${feelsbanman}`;
    },
  };

  let result;

  if (message.content.toLowerCase().match(/^bad bot ?/i)) {
    result = true;
    if (message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])) {
      message.channel.send('I\'m sorry master! :sob:');
    } else {
      await message.channel.send('Fuck you! :rage:');

      const { guild, member } = message;
      let mutedRole = guild.roles.cache.find((r) => r.name === 'Muted');
      if (!mutedRole) {
        mutedRole = await guild.roles.create({ data: { name: 'Muted' } });
      }

      member.roles.add(mutedRole).then(() => {
        setTimeout(() => {
          member.roles.remove(mutedRole);
        },
        30000);
      });

      const now = new Date();

      const mute = new Mute();
      mute.guildId = guild.id;
      mute.discordId = message.author.id;
      mute.mutedAt = now;
      mute.mutedTill = now.add(3, 'm');
      mute.save();

      guild.channels.cache.forEach((c) => {
        c.createOverwrite(mutedRole, { SEND_MESSAGES: false });
      });
    }
  }

  if (message.content.toLowerCase().match(/^ping me ?/i)) {
    message.channel.send(message.author.toString());
  }

  if (!result) {
    Object.entries(messagesStartsWith).some(([input, output]) => {
      const text = message.content.toLocaleLowerCase();
      const escapedInput = escapeRegExp(input);
      const re = new RegExp(`^${escapedInput}[ ,.:]`, 'ui');
      if (text.match(re) || text === input) {
        if (typeof output === 'object' && 'react' in output) {
          sendReaction(message, output.react);
        } else {
          sendFunnyMessage(message, output);
        }
        return true;
      }
    });
  }

  message.channel.stopTyping(true);
}

module.exports = fun;
