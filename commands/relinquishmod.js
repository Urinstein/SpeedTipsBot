const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('relinquishmod')
		.setDescription('Remove yourself from SpeedTips moderators.'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_mod && !tipper.is_admin) {
		return interaction.editReply({ content: ` /${interaction.commandName} is for moderators only.`, ephemeral: true })
		}
		
		tipper.is_mod = false;
		tipper.save();

		return interaction.editReply(`${tipper.name} has relinquished mod.`);
	},
};