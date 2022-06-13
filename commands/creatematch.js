const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu }  = require('discord.js');
const { Match, Team } = require('../dbObjects.js');
const { printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('creatematch')
		.setDescription('Create a new match to tip on.')
		.addIntegerOption(option => option.setName('match_id').setDescription('Enter the match id').setRequired(true)),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_mod && !tipper.is_admin) {
		return interaction.editReply({ content: ` /${interaction.commandName} is for moderators only.`, ephemeral: true })
		}
		
		const match_id = interaction.options.getInteger('match_id');
		if (await Match.count({ where: {id: match_id}, paranoid: false}) > 0) {return interaction.editReply({ content: `A match #${match_id} already exists.`, ephemeral: true })};

		const teams = await Team.findAll();
		const select = new MessageSelectMenu().setCustomId('creatematch').setPlaceholder(`Select the two teams for match #${match_id}`);
		for (const team of teams) {
			select.addOptions([ {label: team.id, description: await printPlayers(team), value: `${team.id}`} ])
				.setMinValues(2).setMaxValues(2);
		}
		await interaction.editReply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });

		const filter = i => { return i.message.interaction.id === interaction.id; };

		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

	
		//user makes selection
		console.log(`${interaction.user.tag} selected /${interaction.commandName} ${collectedSelect.values[0]}`);

		const team_a = collectedSelect.values[0];
		const team_b = collectedSelect.values[1];

		const match = await Match.create({ id: match_id, team_a_id: team_a, team_b_id: team_b});
		await interaction.editReply({ content: 'The match has been added. *You can dismiss the message.*', components: [] });
		return interaction.channel.send(`Match **#${match.id} - ${team_a} vs ${team_b}** has been added. I wonder, who will win. 🤔`);
	},
};