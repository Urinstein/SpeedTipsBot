const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu, MessageButton }  = require('discord.js');
const { Match } = require('../dbObjects.js');
const { printMatch, printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('endmatch')
		.setDescription('Ends the match and award points to the tippers.'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_mod && !tipper.is_admin) {
		return interaction.editReply({ content: ` /${interaction.commandName} is for moderators only.`, ephemeral: true })
		}
		
		matches = await Match.findAll();
		if(matches.length == 0) {return interaction.editReply({ content: 'There are currently no matches to tip on.', ephemeral: true })};

		const select = new MessageSelectMenu().setCustomId('endmatch').setPlaceholder(`Select a match to end.`);
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


		// user made a selection
		console.log(`${interaction.user.tag} selected /${interaction.commandName} ${collectedSelect.values[0]}`);

		const match_id = collectedSelect.values[0];
		const match = await Match.findOne({ where: {id: match_id} });
		if (!match) return collectedSelect.update({ content: `Match #${match_id} already ended or was deleted.`, ephemeral: true });

		var buttons = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`4`).setLabel('4 - 0').setStyle('DANGER'),
			new MessageButton().setCustomId(`3`).setLabel('3 - 1').setStyle('DANGER'),
			new MessageButton().setCustomId(`2`).setLabel('2 - 2').setStyle('DANGER'),
			new MessageButton().setCustomId(`1`).setLabel('1 - 3').setStyle('DANGER'),
			new MessageButton().setCustomId(`0`).setLabel('0 - 4').setStyle('DANGER'),
		)
		var cancel_button = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`99`).setLabel('cancelled').setStyle('SECONDARY'),
		)
		await collectedSelect.update({ content: `${await printMatch(match, false, false, false)}`, components: [buttons, cancel_button] });

		const collectedButton = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'BUTTON'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user pressed a button
		console.log(`${interaction.user.tag} pressed /${interaction.commandName} ${collectedSelect.values[0]} ${collectedButton.customId}`);

		match.result_a = parseInt(collectedButton.customId);
		match.save();

		buttons = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`4`).setLabel('4 - 0').setDisabled(true).setStyle(`${( match.result_a == 4 ? 'DANGER' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`3`).setLabel('3 - 1').setDisabled(true).setStyle(`${( match.result_a == 3 ? 'DANGER' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`2`).setLabel('2 - 2').setDisabled(true).setStyle(`${( match.result_a == 2 ? 'DANGER' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`1`).setLabel('1 - 3').setDisabled(true).setStyle(`${( match.result_a == 1 ? 'DANGER' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`0`).setLabel('0 - 4').setDisabled(true).setStyle(`${( match.result_a == 0 ? 'DANGER' : 'SECONDARY' )}`),
		)
		cancel_button = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`99`).setLabel('cancelled').setDisabled(true).setStyle(`${( match.result_a == 99 ? 'DANGER' : 'SECONDARY' )}`),
		)
		await collectedButton.update({ components: [buttons, cancel_button] });

		if (match.result_a == 99) { return interaction.channel.send(`Match **${await printMatch(match, false, false, false)}** has been cancelled.`); }

		const tips = await match.getTips();
		if (tips.length == 0) {
			await interaction.channel.send(`Here is the result of Match **${await printMatch(match, false, true, true)}**\nNo one made a tip on this match. C'mon guys!`);
			return match.destroy();
		}

		let result_diff = 2*match.result_a - 4;
		let threeP = new Array();
		let oneP = new Array();
		let zeroP = new Array();
		let reply = `📊  Here is the result of **Match ${await printMatch(match, false, true, true)}**\n`;

		for (const tip of tips) {
			const tip_diff = 2*tip.score_a - 4;
			const tipper = await tip.getTipper();
			
			if (result_diff == tip_diff) { 
				tipper.points += (tipper.season_tip === null ? 0 : 3); 
				threeP = threeP.concat(`${(tipper.season_tip === null ? '~~' : '')}${tipper.name}${(tipper.season_tip === null ? '~~' : '')}`); 
			} else if (Math.sign(result_diff) == Math.sign(tip_diff))   { 
				tipper.points += (tipper.season_tip === null ? 0 : 1);   
				oneP =   oneP.concat(`${(tipper.season_tip === null ? '~~' : '')}${tipper.name}${(tipper.season_tip === null ? '~~' : '')}`); 
			} else {
				zeroP =  zeroP.concat(`${(tipper.season_tip === null ? '~~' : '')}${tipper.name}${(tipper.season_tip === null ? '~~' : '')}`); 
			}

			tipper.save();

			( tipper.season_tip === null ? await tip.destroy({force: true}) : await tip.destroy() );
		}
		await match.destroy();

		reply = reply.concat(`▬▬▬▬▬▬▬▬▬▬▬▬▬\n**3 Points go to:**\n> ${threeP.sort().join(", ")}\n\n**1 Point goes to:**\n> ${oneP.sort().join(", ")}\n\n**NO Points go to:**\n> ${zeroP.sort().join(", ")}\n▬▬▬▬▬▬▬▬▬▬▬▬▬`);
		return interaction.channel.send(reply);
	},
};