const { SlashCommandBuilder } = require('@discordjs/builders');
const { Tipper } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addpoints')
		.setDescription('Add/subtract a number of points to a person\'s score.')
		.addStringOption(option => option.setName('user_id').setDescription('Enter the person\'s Discord tag').setRequired(true))
		.addIntegerOption(option => option.setName('points').setDescription('Enter the number of points to add (negative to subtract)').setRequired(true)),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		const tipper_id = interaction.options.getString('user_id');
		const addition = interaction.options.getInteger('points');

		tipper = await Tipper.findOne({ where: { id: tipper_id} })
		if(!tipper) return interaction.editReply({ content: 'That person has not tipped anything yet.', ephemeral: true });

		tipper.points += addition;
		tipper.save();
		return interaction.editReply( `${Math.abs(addition)} points have been ${(addition < 0) ? 'taken away from' : 'given to'} ${tipper.name}.` );
	},
};