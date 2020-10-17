/* noinspection DuplicatedCode */
/* eslint-disable no-param-reassign,no-case-declarations */
const fetchMessages = require('./fetchMessages');
const { flagName } = require('./flags');

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

function getRowValue(row, key = []) {
  if (!row.match(new RegExp(`^${key.source}`, 'i'))) return false;
  console.log(row);
  row = row.replace(key, '').trim();
  let value = row.split(/[:;](.+)/)[1];
  if (value) value = value.trim();
  console.log(value);
  return value;
}

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
        if (field.name === 'console') return;
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

// returns false if signup is invalid
function parse2v2Signup(message) {
  const text = message.content;

  const data = {
    errors: [],
  };

  const { author } = message;
  data.authorTag = author.tag;
  data.authorId = author.id;

  const rows = text.split('\n');

  let value;
  let result;

  result = rows.every((row, i) => {
    const { client } = message;
    switch (i) {
      case 0:
        value = getRowValue(row, /team ?name/i);
        if (!value) return false;
        data.teamName = value;
        break;
      case 1:
        value = getRowValue(row, /psn ?1/i);
        if (!value) return false;
        data.psn1 = value;
        break;
      case 2:
        value = getRowValue(row, /psn ?2/i);
        if (!value) return false;
        data.psn2 = value;
        break;
      case 3:
        const discord1 = getRowValue(row, /discord ?1/i);
        const user1 = getUserFromMention(client, discord1);
        if (!user1) return false;
        data.discordId1 = user1.id;
        data.discordTag1 = user1.tag;
        break;
      case 4:
        const discord2 = getRowValue(row, /discord ?2/i);
        const user2 = getUserFromMention(client, discord2);
        if (!user2) return false;
        data.discordId2 = user2.id;
        data.discordTag2 = user2.tag;
        break;
      case 5:
        value = getRowValue(row, /host/i);
        if (!value) return false;
        value = value.toLowerCase();
        if (!['yes', 'no'].includes(value)) return false;
        data.host = value === 'yes';
        break;
      default:
        return false;
    }
    return true;
  });

  if (rows.length !== 6) {
    result = false;
  }

  if (!result) {
    data.errors.push('result false');
  }

  if (message.mentions.users.size !== 2) {
    data.errors.push('not 2 mentions in the message');
  }

  if (![data.discordId1, data.discordId2].includes(data.authorId)) {
    data.errors.push('author didn\'t mention himself');
  }

  console.log(data);
  return data;
}

parse2v2Signup.prototype.template = `Team Name: Template Team
PSN 1: ctr_tourney_bot
PSN 2: ctr_tourney_bot_2
Discord 1: <@635410532786110464>
Discord 2: <@635410532786110464>
Host: yes`;
module.exports.parse2v2Signup = parse2v2Signup;

module.exports.parse3v3Signup = (message) => {
  const text = message.content;

  const data = {
    teamName: null,
    psn1: null,
    psn2: null,
    psn3: null,
    psnSub: null,
    discord1Id: null,
    discord1Tag: null,
    discord2Id: null,
    discord2Tag: null,
    discord3Id: null,
    discord3Tag: null,
    discordSubId: null,
    discordSubTag: null,
    host: null,
    errors: [],
  };

  const { author } = message;
  data.authorTag = author.tag;
  data.authorId = author.id;

  const rows = text.split('\n');

  const fields = [
    {
      key: /team ?name/i,
      name: 'teamName',
      type: 'plain',
    },
    {
      key: /psn ?1/i,
      name: 'psn1',
      type: 'plain',
    },
    {
      key: /psn ?2/i,
      name: 'psn2',
      type: 'plain',
    },
    {
      key: /psn ?3/i,
      name: 'psn3',
      type: 'plain',
    },
    {
      key: /psn ?sub/i,
      name: 'psnSub',
      type: 'plain',
      optional: true,
    },
    {
      key: /discord ?1/i,
      name: 'discord1',
      type: 'mention',
    },
    {
      key: /discord ?2/i,
      name: 'discord2',
      type: 'mention',
    },
    {
      key: /discord ?3/i,
      name: 'discord3',
      type: 'mention',
    },
    {
      key: /discord ?sub/i,
      name: 'discordSub',
      type: 'mention',
      optional: true,
    },
    {
      key: /host/i,
      name: 'host',
      type: 'boolean',
    },
  ];

  const result = rows.every((row, i) => {
    const { client } = message;

    return fields.some((field) => {
      const value = getRowValue(row, field.key);
      if (!value) {
        if (row.match(field.key) && field.optional) {
          return true;
        }
        return false;
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
        default:
          return false;
      }
    });
  });

  if (!result) {
    data.errors.push('result false');
  }

  if (message.mentions.users.size < 3) {
    data.errors.push('not 3 mentions in the message');
  }

  const discordIds = [data.discord1Id, data.discord2Id, data.discord3Id, data.discordSubId];
  if (!discordIds.includes(data.authorId)) {
    data.errors.push('author didn\'t mention himself');
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

  console.log(data);
  return data;
};

const fields4v4 = [
  {
    key: /team ?name/i,
    name: 'teamName',
    type: 'plain',
  },
  {
    key: /psn ?1/i,
    name: 'psn1',
    type: 'plain',
  },
  {
    key: /psn ?2/i,
    name: 'psn2',
    type: 'plain',
  },
  {
    key: /psn ?3/i,
    name: 'psn3',
    type: 'plain',
  },
  {
    key: /psn ?4/i,
    name: 'psn4',
    type: 'plain',
  },
  {
    key: /psn ?sub ?1/i,
    name: 'psnSub1',
    type: 'plain',
    optional: true,
  },
  {
    key: /psn ?sub ?2/i,
    name: 'psnSub2',
    type: 'plain',
    optional: true,
  },
  {
    key: /Captain/i,
    name: 'discordCaptain',
    type: 'mention',
  },
];

function parse4v4Signup(message) {
  const text = message.content;

  const data = {
    teamName: null,
    psn1: null,
    psn2: null,
    psn3: null,
    psn4: null,
    psnSub1: null,
    psnSub2: null,
    discordCaptainId: null,
    discordCaptainTag: null,
    errors: [],
  };

  const { author } = message;
  data.authorTag = author.tag;
  data.authorId = author.id;

  const rows = text.split('\n');

  // const fields = ;

  const result = rows.every((row, i) => {
    const { client } = message;

    return fields4v4.some((field) => {
      let value = getRowValue(row, field.key);
      if (value === 'NA') value = null;

      if (!value) {
        if (row.match(field.key) && field.optional) {
          return true;
        }
        return false;
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
        default:
          return false;
      }
    });
  });

  if (!result) {
    data.errors.push('result false');
  }

  if (message.mentions.users.size < 1) {
    data.errors.push('no mentions in the message');
  }

  const checkRequired = fields4v4.every((field) => {
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

  console.log(data);

  return data;
}

parse4v4Signup.prototype.fields = fields4v4;
parse4v4Signup.prototype.template = `Team Name: Template Team
Captain: <@635410532786110464>
PSN 1: ctr_tourney_bot
PSN 2: ctr_tourney_bot_2
PSN 3: ctr_tourney_bot_3
PSN 4: ctr_tourney_bot_4
PSN Sub 1: crash_ip21
PSN Sub 2: crashed_ip21 (substitute players are optional)`;
module.exports.parse4v4Signup = parse4v4Signup;

function parseRandomSignup(message) {
  const text = message.content;

  const data = {
    authorId: null,
    authorTag: null,
    captain: null,
    psn: null,
    host: null,
    ps4vc: null,
    discordvc: null,
    errors: [],
  };

  const { author } = message;
  data.authorTag = author.tag;
  data.authorId = author.id;

  const rows = text.split('\n');

  let value;
  const result = rows.every((row, i) => {
    const { client } = message;
    switch (i) {
      case 0:
        value = getRowValue(row, /psn/i);
        if (!value) return false;
        data.psn = value;
        break;
      case 1:
        value = getRowValue(row, /captain/i);
        if (!value) return false;
        value = value.toLowerCase();
        if (!['yes', 'no'].includes(value)) return false;
        data.captain = value === 'yes';
        break;
      case 2:
        value = getRowValue(row, /ps4 vc/i);
        if (!value) return false;
        value = value.toLowerCase();
        if (!['yes', 'no'].includes(value)) return false;
        data.ps4vc = value === 'yes';
        break;
      case 3:
        value = getRowValue(row, /discord vc/i);
        if (!value) return false;
        value = value.toLowerCase();
        if (!['yes', 'no'].includes(value)) return false;
        data.discordvc = value === 'yes';
        break;
      case 4:
        value = getRowValue(row, /host/i);
        if (!value) return false;
        value = value.toLowerCase();
        if (!['yes', 'no'].includes(value)) return false;
        data.host = value === 'yes';
        break;
      default:
        return false;
    }
    return true;
  });

  if (!result) {
    data.errors.push('result false');
  }

  if (!data.discordvc && !data.ps4vc) {
    data.errors.push('both vc are false');
  }

  console.log(data);

  return data;
}

parseRandomSignup.prototype.template = `PSN: ctr_tourney_bot
Captain: yes
PS4 VC: no
Discord VC: yes
Host: yes`;
module.exports.parseRandomSignup = parseRandomSignup;

const fieldsTT = [
  {
    key: /console/i,
    name: 'console',
    type: 'plain',
  },
  {
    key: /gamer tag/i,
    name: 'gamerTag',
    type: 'plain',
  },
];

function parseTTSignup(message) {
  const text = message.content;

  const data = {
    authorId: null,
    authorTag: null,
    console: null,
    gamerTag: null,
    errors: [],
  };

  const { author } = message;
  data.authorTag = author.tag;
  data.authorId = author.id;

  const rows = text.split('\n');

  let value;
  const result = rows.every((row, i) => {
    switch (i) {
      case 0:
        value = getRowValue(row, /console/i);
        if (!['PS4', 'Xbox', 'Switch'].includes(value)) return false;
        data.console = value;
        break;
      case 1:
        value = getRowValue(row, /gamer tag/i);
        if (!value) return false;
        data.gamerTag = value;
        break;
      default:
        return false;
    }

    return true;
  });

  if (!result) {
    data.errors.push('result false');
  }

  console.log(data);

  return data;
}

parseTTSignup.prototype.fields = fieldsTT;
parseTTSignup.prototype.template = `Console: PS4 / Xbox / Switch
Gamer Tag: ctr_tourney_bot / ctr_tourney_bot / SW-1234-5678-9012`;
module.exports.parseTTSignup = parseTTSignup;

// todo split into files
const fieldsFFA = [
  {
    key: /psn/i,
    name: 'psn',
    type: 'plain',
  },
  {
    key: /host/i,
    name: 'host',
    type: 'boolean',
  },
];

function parseFFASignup(message) {
  const text = message.content;

  const data = {
    authorId: null,
    authorTag: null,
    psn: null,
    host: null,
    errors: [],
  };

  const { author } = message;
  data.authorTag = author.tag;
  data.authorId = author.id;

  const rows = text.split('\n');

  const result = rows.every((row) => {
    const { client } = message;

    return fieldsFFA.some((field) => {
      let value = getRowValue(row, field.key);
      if (value === 'NA') value = null;

      if (!value) {
        return !!(row.match(field.key) && field.optional);
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
        default:
          return false;
      }
    });
  });

  if (!result) {
    data.errors.push('result false');
  }

  const checkRequired = fieldsFFA.every((field) => {
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

  console.log(data);

  return data;
}

parseFFASignup.prototype.fields = fieldsFFA;
parseFFASignup.prototype.template = `PSN: ctr_tourney_bot
host: yes`;
module.exports.parseFFASignup = parseFFASignup;

module.exports.parseAndCheckUnique = (message, data, parser) => {
  const { fields } = parser.prototype;
  if (!fields) {
    return new Promise(((resolve) => resolve(data)));
  }

  return checkRepetitions(message, data, fields, parser)
    .then((r) => {
      if (r === true) {
        return data;
      }
      return r;
    });
};

const fieldsWC = [
  {
    key: /psn/i,
    name: 'psn',
    type: 'plain',
  },
  {
    key: /country/i,
    name: 'country',
    type: 'flag',
  },
];

function parseWCSignup(message) {
  const text = message.content;

  const data = {
    authorId: null,
    authorTag: null,
    psn: null,
    country: null,
    errors: [],
  };

  const { author } = message;
  data.authorTag = author.tag;
  data.authorId = author.id;

  const rows = text.split('\n');

  const result = rows.every((row) => {
    const { client } = message;

    return fieldsWC.some((field) => {
      let value = getRowValue(row, field.key);
      if (value === 'NA') value = null;

      if (!value) {
        return !!(row.match(field.key) && field.optional);
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
        case 'flag':
          if (!message.client.flags.includes(value)) {
            return false;
          }
          // data[field.name] = value;
          data.country = flagName[value];
          data.flag = value;
          return true;
        default:
          return false;
      }
    });
  });

  if (!result) {
    data.errors.push('result false');
  }

  const checkRequired = fieldsWC.every((field) => {
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

  console.log(data);

  return data;
}

parseWCSignup.prototype.fields = fieldsWC;
parseWCSignup.prototype.template = `PSN: ctr_tourney_bot
country: 🌐`;
module.exports.parseWCSignup = parseWCSignup;

module.exports.parsers = {
  FFA: parseFFASignup,
  '2v2': parse2v2Signup,
  '4v4': parse4v4Signup,
  WC: parseWCSignup,
};
