const { prefix } = require('../config.js');

module.exports = {
  name: 'help',
  description: 'help',
  cooldown: 5,
  execute(message) {
    const fields = [];
    const staffFields = [];

    message.client.commands.forEach((command) => {
      if (command.noHelp) {
        return;
      }

      const commandName = `${prefix}${command.name}`;
      let { description } = command;

      if (typeof description === 'function') {
        description = description(message);
      }

      const { member } = message;
      if (command.permissions) {
        if (member && member.hasPermission(command.permissions)) {
          staffFields.push({
            name: commandName,
            value: `*${description}*`,
            inline: true,
          });
          return;
        }
        return;
      }

      const permissions = command.permissions ? command.permissions.join(', ') : 'EVERYONE';

      const permLength = command.permissions && command.permissions.length > 1;

      const permissionsText = member && member.roles.cache.find((r) => r.name === 'Admin')
        ? `\nPermission${permLength ? 's' : ''}: \`${permissions}\``
        : '';

      fields.push({
        name: commandName,
        value: `*${description}*`,
        inline: true,
      });
    });

    const fieldsOut = fields.map((f) => `**${f.name}**\n${f.value}`);
    const staffOut = staffFields.map((p) => `**${p.name}**\n${p.value}`);

    message.member.user.createDM()
    .then((dm) => {
      dm.send({
        embed: {
          title: 'Help',
          fields: [
            ...fields,
            {
              name: 'Created by',
              value: '<@548878570722820097>',
            }
          ]
        }
      }).catch(() => {
        message.channel.send({
          embed: {
            title: 'Help',
            fields: [
              ...fields,
              {
                name: 'Created by',
                value: '<@548878570722820097>',
              }],
          },
        })
      });
      
      if (staffOut.length) {
        dm.send({
          embed: {
            title: 'Staff Help',
            fields: staffFields,
          }
        }).catch(() => {
          message.channel.send({
            embed: {
              title: 'Staff Help',
              fields: staffFields,
            },
          });
        });
      }
    })
  }
};
