const { SlashCommandBuilder } = require('@discordjs/builders');
const { isTeamCaptain, loggingError, indent, postpone_match } = require('../index.js');
const { Match } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('postponematch')
		.setDescription('[Captains] Postpone your match.')
        .addIntegerOption(	option => option.setName('id').setDescription('match #number').setRequired(true))
		,

	async execute(interaction) {

		try {
			if (!isTeamCaptain(interaction, 'dummy', 'dummy')) { return interaction.editReply({ content: `Only captains can postpone matches.` }) }

			const match_id = interaction.options.getInteger('id');
			const match = await Match.findOne({ where: {id: match_id}, paranoid: false, include: ['team_a','team_b'] });
			if(!match) {return interaction.editReply({ content: `[Match #${indent(match_id, 3, '0')}] does not exist!` })}		
			if (!isTeamCaptain(interaction, match.team_a.role_id, match.team_b.role_id)) {
				return interaction.editReply({ content: `Your can postpone your own matches only.` })
			}

			return await postpone_match(interaction, match);

		} catch (error) {
			await loggingError('postponematch.js', `${interaction.user.tag} used /${interaction.commandName}`, error)
			return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
		}

	},
};