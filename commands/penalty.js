const { SlashCommandBuilder } = require('@discordjs/builders');
const { Match } = require('../dbObjects.js');
const { isAdmin, loggingAction, loggingError, indent } = require('../index.js');
const { event_type, event_number, match_format  } = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('penalty')
		.setDescription('[Admins] Submit the penalties for a match.')
		.addIntegerOption(	option => option.setName('id')			.setDescription('match #number')			.setRequired(true))
		.addIntegerOption(	option => option.setName('penalty_a')	.setDescription('Team A\'s penalty'))
		.addStringOption(	option => option.setName('reason_a')	.setDescription('reason for the penalty'))
		.addIntegerOption(	option => option.setName('penalty_b')	.setDescription('Team B\'s penalty'))
		.addStringOption(	option => option.setName('reason_b')	.setDescription('reason for the penalty'))	
		,


	async execute(interaction) {
		try {
			if (!isAdmin(interaction)) { return interaction.editReply({ content: `Only admins can award penalites.`}) }

			const match_id = interaction.options.getInteger('id');
			var match = await Match.findOne({ paranoid: false, where: {id: match_id}, include: ['team_a','team_b'] });
			if (!match) { return interaction.editReply({ content: `The match does not exist.`}) }
			if (!match.result_a) { return interaction.editReply({ content: `The match has not yet been played.`}) }

			const penalty_a = interaction.options.getInteger('penalty_a');
			const reason_a = interaction.options.getString('reason_a');
			const penalty_b = interaction.options.getInteger('penalty_b');
			const reason_b = interaction.options.getString('reason_b');

			match.penalty_a = ( penalty_a ? penalty_a : 0 ); 
			match.reason_a = ( reason_a ? reason_a : "" );
			match.penalty_b = ( penalty_b ? penalty_b : 0 );
			match.reason_b = ( reason_b ? reason_b : "" );
			match.save();

			// send match data
			const res = await fetch('https://speedball.the-dmark.com/stats/post/match-data.php',{
				method: 'POST',
				body: JSON.stringify({
					event:				event_type,
					event_number:		event_number,
					match_format:		match_format,
					match_number:		match.id,
					team_a_id:			match.team_a.id,
					penalty_points_a:	match.penalty_a,
					penalty_reason_a:	match.reason_a,
					team_b_id:			match.team_b.id,
					penalty_points_b:	match.penalty_b,
					penalty_reason_b:	match.reason_b
				}),
				headers: { 
					'content-type': 'application/json; charset=UTF-8',
					'accept': '*/*',
					'user-agent':'*'
				},
			})
			if(res.ok){
				//const data = await res.json();
				loggingAction(`[Match #${indent(match.id, 3, '0')}] data has been sent to website.`)
			} else {
				await loggingError(`[Match #${indent(match.id, 3, '0')}] date could not be sent to website.`,'','')
			}

			return interaction.editReply({ content: `Successfully awareded penalty.`})

		} catch (error) {
			await loggingError('submitresults.js', `${interaction.user.tag} used /${interaction.commandName}${typeof collectedSelect !== 'undefined' ? (` [Match #${collectedSelect.values[0]}]${typeof collectedButton !== 'undefined' ? ` ${collectedButton.customId}` : '' }`) : '' }`, error);
			return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
		}
	},
};