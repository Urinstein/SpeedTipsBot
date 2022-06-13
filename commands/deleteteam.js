const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu }  = require('discord.js');
const { Tipper, Team } = require('../dbObjects.js');
const { printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deleteteam')
		.setDescription('Delete a team.'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		const select = new MessageSelectMenu().setCustomId('removeteam').setPlaceholder(`Select a team to delete.`);
		const teams = await Team.findAll();
		for (const team of teams) {
			select.addOptions([ {label: team.id, description: await printPlayers(team), value: `${team.id}`} ])
		}
		await interaction.editReply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });
	
		const filter = i => { return i.message.interaction.id === interaction.id; };

		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. You can dismiss the message.', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

		
		//user makes selection
		console.log(`${interaction.user.tag} selected /${interaction.commandName} ${collectedSelect.values[0]}`);

		const team_id = collectedSelect.values[0];
		const team = await Team.findOne({ where: {id: team_id}});

		const players = await team.getPlayers();
		for (const player of players) { player.destroy();}

		const tippers = await Tipper.findAll();
		for (const tipper of tippers) {
			let tip = tipper.season_tip.split('_');
			for (i = 0; i < tip.length; i++) {
				if (tip[i] === team_id) {tip.splice(i, 1); i = tip.length}
			}
			tipper.season_tip = tip.join('_')
			tipper.save();
		}

		team.destroy();
		return interaction.editReply({ content: `**Team ${team_id}** has been deleted.`, components: [] });
	},
};