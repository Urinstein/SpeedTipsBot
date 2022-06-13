const { SlashCommandBuilder } = require('@discordjs/builders');
const { Formatters }  = require('discord.js');
const { Team } = require('../dbObjects.js');
const { printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('teams')
		.setDescription('Replies with a list of all teams.'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		const teams = await Team.findAll();

		var reply = 'Here\'s all the teams:\n';
		for (const team of teams) {reply = reply.concat(`\n${team.id}     (${await printPlayers(team)})`);}
		return interaction.editReply({ content: Formatters.codeBlock(reply), ephemeral: true });
	},
};