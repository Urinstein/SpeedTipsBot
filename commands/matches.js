const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder }  = require('discord.js');
const { Tip, Match } = require('../dbObjects.js');
const { date_options_short } = require('../index.js')
const { guildId, announcement_channel_id } = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('matches')
		.setDescription('Replies with a list of scheduled matches and your tips on them.'),

	async execute(interaction, myGuild, tipping_channel) {
		const matches = await Match.findAll({ order: [ ['time', 'ASC'] ], include: ['team_a','team_b'] });
		const embed = new EmbedBuilder().setTitle(`${ matches.length == 0 ? 'There are currently scheduled matches' : 'Currently scheduled matches' }`);

		var i = 0;
		for (const match of matches) {
			const tip = await Tip.findOne( {where: {tipper_id: interaction.user.id, match_id: match.id}} );
			const score_a = !(tip) ? false : tip.score_a;
			embed.addFields(
				{ name: `${(score_a != null) ? `${score_a}` : '-'}`, value: `<@&${match.team_a.role_id}>`, inline: true },
				{ name: `${(score_a != null) ? `${4 - score_a}` : '-'}`, value: `<@&${match.team_b.role_id}>`, inline: true },
				{ name: `#${match.id} - ${match.time.toLocaleString("en-GB", date_options_short)}`, value: `https://discord.com/channels/${guildId}/${tipping_channel.id}/${match.tipping_id}`, inline: true },
			)
			i++;
			if(i>7) {return interaction.editReply({content: ' ', embeds: [embed], ephemeral: true });}
		}
		return interaction.editReply({content: ' ', embeds: [embed], ephemeral: true });
	},
};