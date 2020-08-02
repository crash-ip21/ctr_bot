const Command = require('../db/models/command');

module.exports = {
  name: 'commands',
  description: 'Create, edit, delete dynamic commands.',
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  aliases: ['command'],
  execute(message, args) {
    if (args.length === 0) {
      Command.find().then((docs) => {
        if (docs.length) {
          const commands = docs.map((doc) => `\`${doc.name}\``).join('\n');
          message.channel.send(`List of dynamic commands:\n${commands}`);
        } else {
          message.channel.send('There is no dynamic commands.');
        }
      });
      return;
    }

    const action = args[0];

    const ADD = 'add';
    const EDIT = 'edit';
    const DELETE = 'delete';
    const actions = [ADD, EDIT, DELETE];
    if (!actions.includes(action)) {
      message.channel.send(`Wrong action. Allowed actions: ${actions}`);
      return;
    }

    const { client } = message;
    const commandName = args[1];
    switch (action) {
      case ADD:
        if (args.length < 2) {
          message.channel.send('Wrong amount of arguments. Example: `!commands add name`');
          return;
        }

        const staticCommand = client.commands.get(commandName)
          || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));
        if (staticCommand) {
          message.channel.send('There is already a static command with that name!');
          return;
        }

        message.channel.send(`Send a response message for this command. Waiting 1 minute.
Type \`cancel\` to cancel.`).then(() => {
          message.channel
            .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
            .then((collected) => {
              const { content } = collected.first();
              if (content.toLowerCase() === 'cancel') {
                throw new Error('cancel');
              }

              Command.findOne({ name: commandName }).then((command) => {
                if (command) {
                  message.channel.send('There is already a dynamic command with that name!');
                  return;
                }
                const newCommand = new Command();
                newCommand.name = commandName;
                newCommand.message = content;
                newCommand.save().then(() => {
                  message.channel.send('Command added.');
                });
              });
            })
            .catch(() => message.channel.send('Command cancelled.'));
        });

        break;
      case EDIT:
        if (args.length < 2) {
          message.channel.send('Wrong amount of arguments. Example: `!commands edit name`');
          return;
        }

        Command.findOne({ name: commandName }).then((command) => {
          if (command) {
            message.channel.send(`Send a new response message for this command. Waiting 1 minute.
Type \`cancel\` to cancel.`).then(() => {
              message.channel
                .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
                .then((collected) => {
                  const { content } = collected.first();
                  if (content.toLowerCase() === 'cancel') {
                    throw new Error('cancel');
                  }

                  // eslint-disable-next-line no-param-reassign
                  command.message = content;
                  command.save().then(() => {
                    message.channel.send('Command edited.');
                  });
                })
                .catch(() => message.channel.send('Command cancelled.'));
            });
          } else {
            message.channel.send('There is no dynamic command with that name.');
          }
        });

        break;

      case DELETE:
        if (args.length < 2) {
          message.channel.send('Wrong amount of arguments. Example: `!commands delete name`');
          return;
        }
        Command.findOne({ name: commandName }).then((command) => {
          if (command) {
            message.channel.send('Are you sure you want to delete this command? Yes/No. Waiting 1 minute.')
              .then(() => {
                message.channel
                  .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
                  .then((collected) => {
                    const { content } = collected.first();
                    if (content.toLowerCase() === 'yes') {
                      command.delete().then(() => {
                        message.channel.send('Command deleted.');
                      });
                    } else {
                      throw Error('cancel');
                    }
                  })
                  .catch(() => message.channel.send('Command cancelled.'));
              });
          } else {
            message.channel.send('There is no dynamic command with that name.');
          }
        });
        break;
    }
  },
};
