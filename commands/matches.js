const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, Formatters }  = require('discord.js');
const { Tip, Match } = require('../dbObjects.js');
const { date_options_short } = require('../index.js')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('matches')
		.setDescription('Replies with a list of scheduled matches and your tips on them.'),

	async execute(interaction, client, myGuild) {
		const matches = await Match.findAll({ order: [ ['time', 'ASC'] ] });
		const embed = new EmbedBuilder().setTitle(`${ matches.length == 0 ? 'There are currently scheduled matches' : 'Currently scheduled matches' }`);

		var i = 0;
		for (const match of matches) {
			const tip = await Tip.findOne( {where: {tipper_id: interaction.user.id, match_id: match.id}} );
			const score_a = !(tip) ? false : tip.score_a;
			const teamA = await myGuild.roles.fetch(match.team_a_id);
			const teamB = await myGuild.roles.fetch(match.team_b_id);
			embed.addFields(
				{ name: teamA.name, value: `${(score_a) ? `${score_a}` : '-'}`, inline: true },
				{ name: teamB.name, value: `${(score_a) ? `${4 - score_a}` : '-'}`, inline: true },
				{ name: `#${match.id} - ${match.time.toLocaleString("en-GB", date_options_short)}`, value: `${match.is_open ? `[open]` : '[closed]'}`, inline: true },
			)
			i++;
			if(i>7) {return interaction.editReply({content: ' ', embeds: [embed], ephemeral: true });}
		}
		return interaction.editReply({content: ' ', embeds: [embed], ephemeral: true });
	},
};