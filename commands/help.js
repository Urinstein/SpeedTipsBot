const { SlashCommandBuilder } = require('@discordjs/builders');
const { Formatters }  = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Replies with all SpeedTips commands.'),

	async execute(interaction, tipper) {
		reply = 
		`/tip: Make a prediction on a match.
/matches: Replies with a list of all ongoing matches and your tips on them.
/scoreboard: Replies with the SpeedTips Scoreboard.
/allmatches: Replies with all matches, including the ended ones.
/seasontip: Make a prediction on the final results of the league.
`
		if(!tipper || (!tipper.is_mod && !tipper.is_admin)) return interaction.editReply({ content: Formatters.codeBlock(reply), ephemeral: true });
		reply = reply.concat (`
[mod] /creatematch: Create a new match to tip on.
[mod] /closematch: Stop a match from taking any more bets, or open it for bets again.
[mod] /endmatch: Ends the match and award points to the tippers.
[mod] /deletematch: Delete an ongoing match.
[mod] /relinquishmod: Remove yourself from SpeedTips moderators.
`		)
		if(!tipper.is_admin) return interaction.editReply({ content: Formatters.codeBlock(reply), ephemeral: true });
		reply = reply.concat (`
[admin] /endseason: End the season tips and allocate the points.
[admin] /restorematch: Restore an ended match, taking away the awarded points in the process auto-closes it.
[admin] /deletetip: Remove someone\'s tip from a specific match.
[admin] /addpoints: Add/subtract a number of points to a person's score.
[admin] /teams: Replies with a list of all teams and their players.
[admin] /addteam: Add a team.
[admin] /deleteteam: Delete a team along wtih its players.
[admin] /renameteam: Change the name of an existing team.
[admin] /addplayer: Add a player to a team.
[admin] /deleteplayer: Delete a player from a team.
[admin] /addmod: Add/remove someone as SpeedTips moderator.
[admin] /addadmin: Addsomeone as SpeedTips admin.
[admin] /relinquishadmin: Remove yourself from SpeedTips admins.
`		)
		return interaction.editReply({ content: Formatters.codeBlock(reply), ephemeral: true });
	},
};