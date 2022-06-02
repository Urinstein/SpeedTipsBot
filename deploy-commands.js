const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { token, clientId, guildId } = require('./config.json');

const commands = [
	new SlashCommandBuilder()
		.setName('help')
		.setDescription('Replies with all SpeedTips commands.'),
	new SlashCommandBuilder()
		.setName('tip')
		.setDescription('Make a Tip on a match.'),
	new SlashCommandBuilder()
		.setName('scoreboard')
		.setDescription('Replies with the SpeedTips scoreboard.'),
	new SlashCommandBuilder()
		.setName('matches')
		.setDescription('Replies with a list of all ongoing matches and your tips on them.'),
	new SlashCommandBuilder()
		.setName('allmatches')
		.setDescription('Replies with a list of all matches, including the ended ones.'),
	new SlashCommandBuilder()
		.setName('seasontip')
		.setDescription('Make a tip on the overall result of the league.'),

	// mod commands
	new SlashCommandBuilder()
		.setName('creatematch')
		.setDescription('Create a new match to tip on.')
		.addIntegerOption(option => option.setName('match_id').setDescription('Enter the match id').setRequired(true)),
	new SlashCommandBuilder()
		.setName('deletematch')
		.setDescription('Delete an ongoing match.'),
	new SlashCommandBuilder()
		.setName('closematch')
		.setDescription('Stop a match from taking any more bets, or open it for bets again.'),
	new SlashCommandBuilder()
		.setName('endmatch')
		.setDescription('Ends the match and award points to the tippers.'),
	new SlashCommandBuilder()
		.setName('relinquishmod')
		.setDescription('Remove yourself from SpeedTips moderators.'),

	// admin commands
	new SlashCommandBuilder()
		.setName('endseason')
		.setDescription('End the season tips and allocate the points.'),
	new SlashCommandBuilder()
		.setName('restorematch')
		.setDescription('Restore an ended match, taking away the awarded points in the process and auto-closes it.')
		.addIntegerOption(option => option.setName('match_id').setDescription('Enter the match id').setRequired(true)),
	new SlashCommandBuilder()
		.setName('deletetip')
		.setDescription('Remove someone\'s tip from a specific match.'),
	new SlashCommandBuilder()
		.setName('addpoints')
		.setDescription('Add/subtract a number of points to a person\'s score.')
		.addStringOption(option => option.setName('user_id').setDescription('Enter the person\'s Discord tag').setRequired(true))
		.addIntegerOption(option => option.setName('points').setDescription('Enter the number of points to add (negative to subtract)').setRequired(true)),
	new SlashCommandBuilder()
		.setName('teams')
		.setDescription('Replies with a list of all teams.'),
	new SlashCommandBuilder()
		.setName('addteam')
		.setDescription('Add a team.')
		.addStringOption(option => option.setName('team_name').setDescription('Enter the new team\'s name').setRequired(true)),
	new SlashCommandBuilder()
		.setName('deleteteam')
		.setDescription('Delete a team.'),
	new SlashCommandBuilder()
		.setName('renameteam')
		.setDescription('Change the name of an existing team.')
		.addStringOption(option => option.setName('new_name').setDescription('Enter the team\'s name').setRequired(true)),
	new SlashCommandBuilder()
		.setName('addplayer')
		.setDescription('Add a player.')
		.addStringOption(option => option.setName('player_name').setDescription('Enter the new player\'s name').setRequired(true)),
	new SlashCommandBuilder()
		.setName('deleteplayer')
		.setDescription('Delete a player.'),
	new SlashCommandBuilder()
		.setName('addmod')
		.setDescription('Add/remove someone as SpeedTips moderator.')
		.addStringOption(option => option.setName('user_id').setDescription('Enter the person\'s Discord ID').setRequired(true))
		.addStringOption(option => option.setName('user_name').setDescription('Enter the person\'s name').setRequired(true)),
	new SlashCommandBuilder()
		.setName('addadmin')
		.setDescription('Add someone as SpeedTips admin.')
		.addStringOption(option => option.setName('user_id').setDescription('Enter the person\'s Discord ID').setRequired(true))
		.addStringOption(option => option.setName('user_name').setDescription('Enter the person\'s name').setRequired(true)),
	new SlashCommandBuilder()
		.setName('relinquishadmin')
		.setDescription('Remove yourself from SpeedTips admins.'),
	new SlashCommandBuilder()
		.setName('restartbot')
		.setDescription('Restarts SpeedTipsBot.'),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);