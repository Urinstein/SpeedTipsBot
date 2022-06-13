const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('relinquishadmin')
		.setDescription('Remove yourself from SpeedTips admins.'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		tipper.is_admin = false;
		tipper.save();

		return interaction.editReply(`${interaction.name} has relinquished admin.`);
	},
};