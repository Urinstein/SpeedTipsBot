const { SlashCommandBuilder } = require('@discordjs/builders');
const { Team } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addteam')
		.setDescription('Add a team.')
		.addStringOption(option => option.setName('team_name').setDescription('Enter the new team\'s name').setRequired(true)),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		const team_id = interaction.options.getString('team_name');
		if (Team.count({ where: {id: team_id}}) > 0) return interaction.editReply({ content: 'That team already exists.', ephemeral: true });

		await Team.create({ id: team_id });
		return interaction.editReply({ content: `Team **${team_id}** has been created.`, ephemeral: true });
	},
};