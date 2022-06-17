const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu, MessageButton }  = require('discord.js');
const { Tipper, Tip, Match } = require('../dbObjects.js');
const { printMatch, printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tip')
		.setDescription('Make a Tip on a match.'),

	async execute(interaction, tipper) {

		let matches = await Match.findAll({ where: {is_open: true} });
		if(matches.length == 0) {return interaction.editReply({ content: 'There are currently no matches to tip on.', ephemeral: true })};

		let reply = null;
		if (!tipper || tipper.season_tip === null) { reply = '***You will not receive any points from tips, unless you make your /seasontip.***'}

		const select = new MessageSelectMenu().setCustomId('tip').setPlaceholder(`Select a match to tip on.`);
		for (const match of matches) {
			const tip = await Tip.findOne({ where: {tipper_id: interaction.user.id, match_id: match.id} });
			let tip_tag = (!tip ? '' : `[${tip.score_a} - ${4 - tip.score_a}] `)
			select.addOptions([ {label: `${tip_tag}${await printMatch(match, false, false, false)}`, 
								description: `${await printPlayers(match.team_a_id)}   vs   ${await printPlayers(match.team_b_id)}`, 
								value: `${match.id}`} ])
		}
		await interaction.editReply({ content: reply, components: [new MessageActionRow().addComponents(select)], ephemeral: true });

		const filter = i => { return i.message.interaction.id === interaction.id; };

		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

		// user made a selection
		console.log(`${interaction.user.tag} selected /${interaction.commandName} ${collectedSelect.values[0]}`);

		const match_id = collectedSelect.values[0];
		const match = await Match.findOne({ where: {id: match_id} });
		if (!match) return interaction.editReply({ content: `Match #${match_id} already ended or was deleted.`, ephemeral: true });

		const buttons = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`4`).setLabel('4 - 0').setStyle('PRIMARY'),
			new MessageButton().setCustomId(`3`).setLabel('3 - 1').setStyle('PRIMARY'),
			new MessageButton().setCustomId(`2`).setLabel('2 - 2').setStyle('PRIMARY'),
			new MessageButton().setCustomId(`1`).setLabel('1 - 3').setStyle('PRIMARY'),
			new MessageButton().setCustomId(`0`).setLabel('0 - 4').setStyle('PRIMARY'),
		)
		await collectedSelect.update({ content: `${await printMatch(match, false, false, false)}`, components: [buttons], ephemeral: true });

		const collectedButton = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'BUTTON'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user pressed a button
		console.log(`${interaction.user.tag} pressed /${interaction.commandName} ${collectedSelect.values[0]} ${collectedButton.customId}`);

		const score_a = parseInt(collectedButton.customId);

		const pushed_buttons = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`4`).setLabel('4 - 0').setDisabled(true).setStyle(`${( score_a == 4 ? 'PRIMARY' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`3`).setLabel('3 - 1').setDisabled(true).setStyle(`${( score_a == 3 ? 'PRIMARY' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`2`).setLabel('2 - 2').setDisabled(true).setStyle(`${( score_a == 2 ? 'PRIMARY' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`1`).setLabel('1 - 3').setDisabled(true).setStyle(`${( score_a == 1 ? 'PRIMARY' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`0`).setLabel('0 - 4').setDisabled(true).setStyle(`${( score_a == 0 ? 'PRIMARY' : 'SECONDARY' )}`),
		)

		if (!tipper) { tipper = await Tipper.create( {id: interaction.user.id, name: interaction.member.nickname} ); }
		
		var tip = await Tip.findOne({ where: { tipper_id: tipper.id, match_id: match.id } });
		if (!tip) {
			tip = await Tip.create({ tipper_id: tipper.id, match_id: match.id, score_a: score_a });
		}
		tip.score_a = score_a;
		await tip.save();

		return collectedButton.update({ content: await printMatch(match, false, false, false), components: [pushed_buttons], ephemeral: true });
	},
};