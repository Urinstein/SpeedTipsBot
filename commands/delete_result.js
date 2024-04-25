const { SlashCommandBuilder } = require('@discordjs/builders');
const { isAdmin, loggingError, delete_result, indent } = require('../index.js');
const { Tip, Tipper, Match } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete_result')
		.setDescription('[Admin] Delete a matches result (and revert the points).')
        .addIntegerOption(	option => option.setName('id').setDescription('match #number').setRequired(true))
		,

	async execute(interaction) {

		try {
			if (!isAdmin(interaction)) { return interaction.editReply({ content: `Only admins can delete a result.` }) }

			const match_id = interaction.options.getInteger('id');
			const match = await Match.findOne({ where: {id: match_id}, paranoid: false, include: ['team_a','team_b'] });

			if(!match) {return interaction.editReply({ content: `[Match #${indent(match_id, 3, '0')}] does not exist!` })}
			if(match.result_a == null) {return interaction.editReply({ content: `[Match #${indent(match_id, 3, '0')}] already has no result!` })}

			await delete_result(interaction, match);


		} catch (error) {
			await loggingError('matchnn.js', `${interaction.user.tag} used /${interaction.commandName}`, error)
			return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
		}

	},
};