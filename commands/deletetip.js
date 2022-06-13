const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu }  = require('discord.js');
const { Tip, Match } = require('../dbObjects.js');
const { printMatch } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deletetip')
		.setDescription('Remove someone\'s tip from a specific match.'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		let matches = await Match.findAll();
		if(matches.length == 0) {return interaction.editReply({ content: 'There are currently no matches.', ephemeral: true })};

		let select = new MessageSelectMenu().setCustomId('deletetip').setPlaceholder(`Select a match from which to delete a tip.`);
		for (const match of matches) {
			select.addOptions([ {label: `${await printMatch(match, true, false, false)}`, 
								value: `${match.id}`} ])
		}
		await interaction.editReply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });

		const filter = i => { return i.message.interaction.id === interaction.id; };

		let collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user made a selection
		console.log(`${interaction.user.tag} selected /${interaction.commandName} ${collectedSelect.values[0]}`);

		const match_id = collectedSelect.values[0];
		const match = await Match.findOne({ where: {id: match_id} });
		if (!match) return collectedSelect.update({ content: `Match #${match_id} already ended or was deleted.`, components: [] });

		const tips = await Tip.findAll({ where: {match_id: match_id}});
		if(tips.length == 0) return interaction.editReply({ content: 'There are currently no tips for on match.', components: [] });

		select = new MessageSelectMenu().setCustomId('deletetip').setPlaceholder(`Select a person to remove their tip from match #${match_id}`);
		for (const tip of tips) {
			tipper = await tip.getTipper();
			select.addOptions([ {label: `${tipper.name}`, 
			value: `${tip.tipper_id}`} ])
		}
		await collectedSelect.update({ components: [new MessageActionRow().addComponents(select)] });

		collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user made a selection
		console.log(`${interaction.user.tag} selected /${interaction.commandName} ${match_id} ${collectedSelect.values[0]}`);

		const tip = await Tip.findOne({ where: {match_id: match_id, tipper_id: collectedSelect.values[0]} });
		tipper = await tip.getTipper();
		await collectedSelect.update({ content: `${tipper.name}\'s tip on match #${match_id} has been removed.`, components: [] })
		return tip.destroy();
	},
};