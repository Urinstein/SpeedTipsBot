const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu }  = require('discord.js');
const { Match } = require('../dbObjects.js');
const { printMatch, printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('closematch')
		.setDescription('Stop a match from taking any more bets, or open it for bets again.'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_mod && !tipper.is_admin) {
		return interaction.editReply({ content: ` /${interaction.commandName} is for moderators only.`, ephemeral: true })
		}
		
		const matches = await Match.findAll();
		if (matches == 0) {return interaction.editReply({ content: 'There are currently no matches to close/open.', ephemeral: true })};

		const select = new MessageSelectMenu().setCustomId('closematch').setPlaceholder(`Select a match to close/open`);
		for (const match of matches) {
			select.addOptions([ {label: `${await printMatch(match, true, false, false)}`, 
								description: `${await printPlayers(match.team_a_id)}   vs   ${await printPlayers(match.team_b_id)}`, 
								value: `${match.id}`} ])
		}
		await interaction.editReply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });
		
		const filter = i => { return i.message.interaction.id === interaction.id; };

		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		//user makes selection
		console.log(`${interaction.user.tag} selected /${interaction.commandName} ${collectedSelect.values[0]}`);

		const match_id = collectedSelect.values[0];
		const match = await Match.findOne({ where: {id: match_id}});
		if (!match) return interaction.editReply({ content: `Match #${match_id} already ended or was deleted.`, ephemeral: true });

		match.is_open = !match.is_open;
		match.save();
		const reply = ( match.is_open == false ? 'closed' : 'reopened');

		await interaction.editReply({ content: `**Match #${match.id}** has been ${reply}. *You can dismiss the message.*`, components: [] });
		return interaction.channel.send(`Match #${match.id} - ${match.team_a_id} vs ${match.team_b_id} has been ${reply} for tips.`);
	},
};