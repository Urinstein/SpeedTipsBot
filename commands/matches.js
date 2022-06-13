const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed }  = require('discord.js');
const { Tip, Match } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('matches')
		.setDescription('Replies with a list of ongoing matches and your tips on them.'),

	async execute(interaction, tipper) {
		const matches = await Match.findAll();
		const embed = new MessageEmbed().setTitle(`${ matches.length == 0 ? 'There are currently no ongoing matches' : 'Currently ongoing matches' }`);

		for (const match of matches) {
			const tip = await Tip.findOne( {where: {tipper_id: interaction.user.id, match_id: match.id}} );
			embed.addFields(
				{ name: `#${match.id}`, value: `${match.is_open ? `[open]` : '[closed]'}`, inline: true },
				{ name: match.team_a_id, value: `${(tip) ? `${tip.score_a}` : '-'}`, inline: true },
				{ name: match.team_b_id, value: `${(tip) ? `${4 - tip.score_a}` : '-'}`, inline: true },
			)	
		}
		return interaction.editReply({ embeds: [embed], ephemeral: true });
	},
};