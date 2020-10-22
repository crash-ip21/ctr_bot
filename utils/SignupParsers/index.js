/* eslint-disable no-param-reassign,no-case-declarations */
const fetchMessages = require('../fetchMessages');
const { flagName } = require('../flags');
const ffa = require('./ffa.js');
const _2v2 = require('./2v2.js');
const _3v3 = require('./3v3.js');
const _4v4 = require('./4v4.js');
const wc = require('./wc.js');

function getUserFromMention(client, mention) {
  if (!mention) return null;

  if (mention.startsWith('<@') && mention.endsWith('>')) {
    mention = mention.slice(2, -1);

    if (mention.startsWith('!')) {
      mention = mention.slice(1);
    }

    return client.users.cache.get(mention);
  }

  return null;
}

module.exports.getUserFromMention = getUserFromMention;

function getRowValue(row, key = []) {
  if (!row.match(new RegExp(`^${key.source}`, 'i'))) return false;
  row = row.replace(key, '').trim();
  let value = row.split(/[:;](.+)/)[1];
  if (value) value = value.trim();
  return value;
}

module.exports.getRowValue = getRowValue;

// todo better repetition check for PSNs (PSN1, PSN2, ...)
function checkRepetitions(message, data, fields, parse) {
  const { channel } = message;
  return fetchMessages(channel, 500).then((messages) => {
    messages.pop(); // remove (first template message)
    const errors = [];
    let result = true;
    messages.forEach((m) => {
      if (m.id === message.id) {
        return;
      } // ignore current message

      if (m.type === 'PINS_ADD' || m.author.bot) {
        return;
      }

      const tmpData = parse(m, false);
      fields.forEach((field) => {
        if (field.type === 'boolean') return;
        if (field.type === 'flag') return;
        let key = field.name;
        if (field.type === 'mention') {
          key = `${key}Id`;
        }
        const dataValue = data[key];
        if (dataValue) {
          const tmpDataValue = tmpData[key];
          const comp = dataValue !== tmpDataValue;
          if (!comp) {
            errors.push(`Repeat ${key}: ${dataValue}`);
            result = false;
          }
        }
      });
    });
    if (!result) {
      return { errors };
    }
    return result;
  });
}

module.exports.checkRepetitions = checkRepetitions;

module.exports.parse = (message, fields) => {
  const text = message.content;

  const data = {
    authorId: null,
    authorTag: null,
    errors: [],
  };

  // it is important to have all keys initialized for convenient csv generation in parse_signups.js
  fields.forEach((field) => {
    if (field.type === 'mention') {
      data[`${field.name}Id`] = null;
      data[`${field.name}Tag`] = null;
      return;
    }
    data[field.name] = null;
  });

  const { author } = message;
  data.authorTag = author.tag;
  data.authorId = author.id;

  const rows = text.split('\n');

  const result = rows.every((row) => {
    const { client } = message;

    return fields.some((field) => {
      const value = getRowValue(row, field.key);

      if (!value) {
        return row.match(field.key) && field.optional;
      }

      let mention;

      switch (field.type) {
        case 'plain':
          data[field.name] = value;
          return true;
        case 'mention':
          mention = getUserFromMention(client, value);
          if (!mention) return false;
          data[`${field.name}Id`] = mention.id;
          data[`${field.name}Tag`] = mention.tag;
          return true;
        case 'boolean':
          if (!['yes', 'no'].includes(value.toLowerCase())) return false;
          data[field.name] = value.toLowerCase() === 'yes';
          return true;
        case 'flag': // unique for WC
          if (!message.client.flags.includes(value)) {
            return false;
          }
          data[field.name] = value;
          data[`${field.name}_name`] = flagName[value];
          return true;
        default:
          return false;
      }
    });
  });

  if (!result) {
    data.errors.push('result false');
  }

  const checkRequired = fields.every((field) => {
    if (field.optional) return true;
    if (field.type === 'mention') {
      return data[`${field.name}Id`] && data[`${field.name}Tag`];
    }
    if (field.type === 'boolean') {
      return data[field.name] !== null;
    }
    return data[field.name];
  });

  if (!checkRequired) {
    data.errors.push('not every field is filled');
  }

  if ('discordvc' in data && 'ps4vc' in data && !data.discordvc && !data.ps4vc) {
    data.errors.push('both vc are false');
  }

  //   if (![data.discordId1, data.discordId2].includes(data.authorId)) {
  //     data.errors.push('author didn\'t mention himself');
  //   } // todo

  // todo check unique

  // console.log(data);

  return data;
};

module.exports.parseAndCheckUnique = (message, data, parse, fields) => {
  if (!fields) {
    return new Promise(((resolve) => resolve(data)));
  }

  return checkRepetitions(message, data, fields, parse)
    .then((r) => {
      if (r === true) {
        return data;
      }
      return r;
    });
};

module.exports.parsers = {
  FFA: ffa,
  '2v2': _2v2,
  '3v3': _3v3,
  '4v4': _4v4,
  WC: wc,
};
