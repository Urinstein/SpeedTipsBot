const { SlashCommandBuilder } = require('@discordjs/builders');
const { Formatters }  = require('discord.js');
const { Tipper } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('scoreboard')
		.setDescription('Replies with the SpeedTips scoreboard.'),

	async execute(interaction, tipper) {
		const tippers = await Tipper.findAll({ order: [ ['points', 'DESC'] ] });

		var reply = 'Here\'s the current SpeedTips scoreboard:';
		for (const tipper of tippers) {
			var tag = '';
			if(tipper.is_admin) tag = '  (admin)'
			else if(tipper.is_mod) tag = '  (mod)'
			var tips = await tipper.countTips({paranoid: false}) - await tipper.countTips();
			reply = reply.concat(`\n${tipper.points} (${tips}) - ${tipper.name}${tag}`);
		}
		return interaction.editReply({ content: Formatters.codeBlock(reply), ephemeral: true });
	},
};