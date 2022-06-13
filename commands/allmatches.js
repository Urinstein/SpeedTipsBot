const { SlashCommandBuilder } = require('@discordjs/builders');
const { Formatters }  = require('discord.js');
const { Match } = require('../dbObjects.js');
const { printMatch } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('allmatches')
		.setDescription('Replies with a list of all matches, including the ended ones.'),

	async execute(interaction, tipper) {
		const matches = await Match.findAll({paranoid: false});
		var reply = 'Here are all matches including the already ended ones:\n'

		for (const match of matches) {
			reply = reply.concat(`\n${await printMatch(match.id, false, false, false)}`);
		}
		return interaction.editReply({ content: Formatters.codeBlock(reply), ephemeral: true });
	},
};