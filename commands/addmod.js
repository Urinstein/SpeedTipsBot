const { SlashCommandBuilder } = require('@discordjs/builders');
const { Tipper } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addmod')
		.setDescription('Add/remove someone as SpeedTips moderator.')
		.addStringOption(option => option.setName('user_id').setDescription('Enter the person\'s Discord ID').setRequired(true))
		.addStringOption(option => option.setName('user_name').setDescription('Enter the person\'s name').setRequired(true)),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}

		const tipper_id = interaction.options.getString('user_id');
		const tipper_name = interaction.options.getString('user_name');

		tipper = await Tipper.findOne({ where: { id: tipper_id } })
		if(!tipper) { tipper = await Tipper.create({ id: tipper_id, name: tipper_name});}
		tipper.is_mod = !tipper.is_mod;
		tipper.save();

		return interaction.editReply(`${tipper.name} has been ${( tipper.is_mod == true ? 'added as a mod' : 'removed from the mods')}.`);
	},
};