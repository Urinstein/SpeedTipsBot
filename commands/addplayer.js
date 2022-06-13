const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu }  = require('discord.js');const { ActionRowBuilder } = require("@discordjs/builders");
const { Team, Player } = require('../dbObjects.js');
const { printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addplayer')
		.setDescription('Add a player.')
		.addStringOption(option => option.setName('player_name').setDescription('Enter the new player\'s name').setRequired(true)),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}

		const player_id = interaction.options.getString('player_name');
		if (Player.count({ where: {id: player_id}}) > 0) return interaction.editReply({ content: 'This player is already in a team.', ephemeral: true });

		const teams = await Team.findAll();

		const select = new MessageSelectMenu().setCustomId('addplayer').setPlaceholder(`Select a team to add ${player_id} to.`);
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
		await Player.create({ id: player_id, team_id: team_id});

		return interaction.editReply({ content: `Player **${player_id}** has been added to Team **${team_id}**`, components: [] });
	},
};