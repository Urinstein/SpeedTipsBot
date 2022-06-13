const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu }  = require('discord.js');
const { Team, Player } = require('../dbObjects.js');
const { printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deleteplayer')
		.setDescription('Delete a player.'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		const teams = await Team.findAll();
		let select = new MessageSelectMenu().setCustomId('deleteplayer').setPlaceholder(`Select a team from which you want to delete a player.`);
		for (const team of teams) {
			select.addOptions([ {label: team.id, description: await printPlayers(team), value: `${team.id}`} ])
		}
		await interaction.editReply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });

		const filter = i => { return i.message.interaction.id === interaction.id; };

		let collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user makes a selection
		const team = await Team.findOne({ where: {id: collectedSelect.values[0]}});
		const players = await team.getPlayers();
		select = new MessageSelectMenu().setCustomId('deleteplayer').setPlaceholder(`Select a player to delete.`);
		for (const player of players) {
			select.addOptions([ {label: player.id, value: `${player.id}`} ])
		}
		await collectedSelect.update({ components: [new MessageActionRow().addComponents(select)] });

		collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user makes a selection
		const player = await Player.findOne({ where: {id: collectedSelect.values[0]}})
		player.destroy();
		await collectedSelect.update({ content: `Player '${collectedSelect.values[0]}' from team '${team.id}' has been deleted.`, components: [] });
	},
};