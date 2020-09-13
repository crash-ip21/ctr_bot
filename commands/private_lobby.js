const deletePrivateLobby = require('../utils/deletePrivateLobby');
const Moment = require('moment');
const PrivateLobby = require('../db/models/private_lobbies');

/**
 * Returns the embed for the private lobby
 * @param info
 * @param players
 * @param description
 * @param created
 * @returns {{footer: {icon_url: string, text: string}, author: {icon_url: string, name: string}, description: *, title: string, fields: [{inline: boolean, name: string, value: *}, {inline: boolean, name: string, value: string}]}}
 */
function getEmbed(info, players, description, created) {
    const icon = 'https://vignette.wikia.nocookie.net/crashban/images/e/eb/CTRNF-%3F_Crate_Iron_Checkpoint_Crate_icon.png';
    
    if (players.length <= 0) {
        players = ['No players yet'];
    }
    
    return {
        author: {
            name: `A private lobby is gathering!`,
            icon_url: icon
        },
        description: description,
        fields: [
            {
                name: 'Info',
                value: info.join('\n'),
                inline: true
            },
            {
                name: 'Players',
                value: players.join('\n'),
                inline: true
            }
        ],
        footer: {
            text: `Created at ${created}`,
            icon_url: icon
        }
    };
}

/**
 * Saves a private lobby in the database
 * @param privateLobby
 */
function savePrivateLobby(privateLobby) {
    const savePromise = privateLobby.save();
    Promise.resolve(savePromise).then(() => {});
}

/**
 * Updates a private lobby with the given players
 * @param privateLobby
 * @param players
 * @param userId
 */
function updatePrivateLobby(privateLobby, players, userId) {
    const updatePromise = privateLobby.updateOne({ creator: userId }, { players: players });
    Promise.resolve(updatePromise).then(() => {});
}

module.exports = {
    name: 'private_lobby',
    description: 'Create a new private lobby. Usage: `!private_lobby [mode] [players]',
    guildOnly: true,
    aliases: ['pl'],
    execute(message, args) {
        const allowedChannels = [
            message.channel.guild.channels.cache.find((c) => c.name.toLowerCase() === 'war-search'),
            message.channel.guild.channels.cache.find((c) => c.name.toLowerCase() === 'private-lobbies')
        ];
        
        if (!allowedChannels.find((c) => { return c.name === message.channel.name })) {
            return message.channel.send(`This command can only be used in the following channels:
${allowedChannels.join('\n')}`);
        }
        
        const modes = [
            'FFA',
            'Itemless',
            '2vs2',
            '3vs3',
            '4vs4',
            'Battle'
        ];
        
        let mode = args[0] || 'FFA';
        
        if (mode === 'help') {
            return message.channel.send(`\`\`\`This command lets you create private lobbies similar to ranked lobbies. The usage is: !private_lobby [mode] [players].

[mode] can be any of:
 - ${modes.join('\n - ')}

[players] is the maximum amount of players that can join the lobby.

Example usage: !private_lobby FFA 8.\`\`\``);
        }
        
        PrivateLobby.findOne({creator: message.member.user.id}).then((privateLobby) => {
            if (privateLobby) {
                return message.channel.send('You have already created a private lobby. Please remove the old one if you want to create another one.');
            } else {
                if (!modes.find((t) => (t.toLowerCase() === mode.toLowerCase()))) {
                    return message.channel.send('Invalid mode.');
                }
                
                mode = mode.charAt(0).toUpperCase() + mode.slice(1);
                
                const defaultDescription = 'React with ✅ to participate!';
                const closedDescription = 'The lobby is now closed!';
                
                const author = `<@${message.member.user.id}>`;
                const maxPlayers = args[1] || 8;
                const created = Moment().format('hh:mm:ss a');
                let players = [];
                
                const info = [
                    `Creator: **${author}**`,
                    `Mode: **${mode}**`,
                    `Players: **${maxPlayers}**`,
                ];
                
                let embed = getEmbed(info, players, defaultDescription, created);
                
                message.channel.send({embed: embed}).then((m) => {
                    m.react('✅');
                    m.pin();
                    
                    privateLobby = new PrivateLobby({
                        guild       : m.guild.id,
                        channel     : message.channel.id,
                        message     : m.id,
                        creator     : message.member.user.id,
                        mode        : mode,
                        maxPlayers  : maxPlayers,
                        players     : players,
                        date        : created
                    });
                    
                    savePrivateLobby(privateLobby);
                    
                    const filter = (r, u) => (['✅'].includes(r.emoji.name) && u.id !== m.author.id);
                    const options = {
                        max     : maxPlayers,
                        time    : 3600000,
                        errors  : ['time'],
                        dispose : true
                    };
                    
                    const collector = m.createReactionCollector(filter, options);
                    collector.on('collect', (reaction, user) => {
                        if (reaction.message.id === m.id) {
                            if (reaction.users.cache.size < maxPlayers) {
                                if (user.id !== m.author.id) {
                                    players.push(`<@${user.id}>`)
                                }
                                
                                embed = getEmbed(info, players, defaultDescription, created);
                            } else {
                                embed = getEmbed(info, players, closedDescription, created);
                            }
                            
                            m.edit({embed: embed});
                            updatePrivateLobby(privateLobby, players, message.member.user.id);
                        }
                    });
                    
                    collector.on('remove', ((reaction, user) => {
                        if (reaction.message.id === m.id) {
                            players.forEach((v, i) => {
                                if (v === `<@${user.id}>`) {
                                    players.splice(i, 1);
                                }
                            });
                            
                            embed = getEmbed(info, players, defaultDescription, created);
                            m.edit({embed: embed});
                            updatePrivateLobby(privateLobby, players, message.member.user.id);
                        }
                    }));
                    
                    collector.on('end', () => {
                        deletePrivateLobby(message.channel, message.member.user.id);
                    })
                });
            }
        });
    }
}