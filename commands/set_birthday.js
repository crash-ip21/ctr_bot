const moment = require('moment');
const Player = require('../db/models/player');

/**
 * Creates an array with a range of numbers
 * @param size
 * @param startAt
 * @returns {unknown[]}
 */
function range(size, startAt = 0) {
  return [...Array(size).keys()].map((i) => i + startAt);
}

module.exports = {
  name: 'set_birthday',
  description: 'Set your birthday.',
  guildOnly: true,
  execute(message, args) {
    if (args.length > 0 && args[0] === 'unset') {
      Player.updateOne({ discordId: message.author.id }, { birthday: null }).exec();
      return message.channel.send('Your birthday has been unset.');
    }

    const currentDate = new Date();

    const years = range(40, currentDate.getFullYear() - 50);
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const days = range(31, 1);

    return message.channel.send('Please enter the year. The value must be between 1970 and 2010. Waiting 1 minute.').then((confirmMessage) => {
      const filter = (m) => m.author.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };

      message.channel.awaitMessages(filter, options).then((collectedMessages) => {
        const collectedMessage = collectedMessages.first();
        const { content } = collectedMessage;

        confirmMessage.delete();
        collectedMessage.delete();

        if (years.includes(Number(content))) {
          const year = content;

          return message.channel.send(`Select month. Waiting 1 minute.
\`\`\`
${months.map((m, i) => m = `${i + 1} - ${m}`).join('\n')}
\`\`\``).then((confirmMessage) => {
            message.channel.awaitMessages(filter, options).then((collectedMessages) => {
              const collectedMessage = collectedMessages.first();
              const { content } = collectedMessage;

              confirmMessage.delete();
              collectedMessage.delete();

              if (range(12, 1).includes(Number(content))) {
                let month = content;

                if (month < 10) {
                  month = `0${month}`;
                }

                return message.channel.send('Please enter the day. The value must be between 1 and 31. Waiting 1 minute.').then((confirmMessage) => {
                  message.channel.awaitMessages(filter, options).then((collectedMessages) => {
                    const collectedMessage = collectedMessages.first();
                    const { content } = collectedMessage;

                    confirmMessage.delete();
                    collectedMessage.delete();

                    if (days.includes(Number(content))) {
                      let day = content;

                      if (day < 10) {
                        day = `0${day}`;
                      }

                      const birthday = `${year}-${month}-${day}`;
                      const birthDate = moment(birthday);

                      if (!birthDate.isValid()) {
                        return message.channel.send(`The date "${birthday}" is invalid.`);
                      }

                      Player.updateOne({ discordId: message.author.id }, { birthday }).exec();
                      message.channel.send(`Your birthday has been set to ${birthday}.`);
                    } else {
                      message.channel.send('Command canceled.');
                    }
                  });
                }).catch(() => message.channel.send('Command canceled.'));
              }
              message.channel.send('Command canceled.');
            });
          }).catch(() => message.channel.send('Command canceled.'));
        }
        message.channel.send('Command canceled.');
      }).catch(() => message.channel.send('Command canceled.'));
    });
  },
};
