const { SlashCommandBuilder } = require('@discordjs/builders');
const { Formatters,  MessageActionRow, MessageSelectMenu, MessageButton }  = require('discord.js');
const { Tipper, Team } = require('../dbObjects.js');
const { printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('endseason')
		.setDescription('End the season tips and allocate the points.'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		let buttons = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`ok`).setLabel('I understand').setStyle('DANGER'),
			new MessageButton().setCustomId(`no`).setLabel('I\'d rather not').setStyle('SECONDARY'),
		)
		await interaction.editReply({ content: `Ending the season will award every tipper their season tip score.\n***Only do this if the season is actually over, and be sure to inout the correct results!***`, components: [buttons], ephemeral: true });

		const filter = i => { return i.message.interaction.id === interaction.id; };

		collected = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'BUTTON'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collected.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}
		if (collected.customId == 'no') {return collected.update({ content: 'Alright.', components: [] })}


		// user pressed the OK button
		let result = new Array();
		let reply = ``
		let teams = await Team.findAll();
		let length = teams.length;

		for (let i = 0; i < length; i++) {
			const select = new MessageSelectMenu().setCustomId(`leaguetip_${i}`).setPlaceholder(`Select the team on position #${i+1}`);
			
			for (let j = 0; j < teams.length; j++) {
				select.addOptions([ {label: teams[j].id, description: await printPlayers(teams[j]), value: `${j}`} ])
			}
			await collected.update({ content: `The season result:\n\`\`\`\n${reply}\`\`\`\n`, components: [new MessageActionRow().addComponents(select)] });

			collected = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
				.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) });
			if (collected.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

			result = result.concat(teams[parseInt(collected.values[0])].id);
			reply = reply.concat(`\n${i+1}) ${teams[parseInt(collected.values[0])].id}`);
			teams.splice(parseInt(collected.values[0]), 1);
		}


		// user made selections
		buttons = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`ok`).setLabel('Confirm the result.').setStyle('DANGER'),
			new MessageButton().setCustomId(`no`).setLabel('Nevermind').setStyle('SECONDARY'),
		)
		await collected.update({ content: `The season result:\n\`\`\`\n${reply}\`\`\`\n***Are you sure this result is correct?***`, components: [buttons] });

		collected = await interaction.channel?.awaitMessageComponent({ filter, idle: 180 * 1000, componentType: 'BUTTON'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collected.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}
		if (collected.customId == 'no') {return collected.update({ content: 'Alright', components: [] })}


		// user pressed the OK button
		await collected.update({ content: `The season result:\n\`\`\`\n${reply}\`\`\`\n`, components: [] });

		let tippers = await Tipper.findAll();
		for (const tipper of tippers) {
			const tip = tipper.season_tip.split("_");
			let points = 0;
			for (let i = 0; i < length; i++) {
				if 		(tip[i] === result[i])								{points += 5;}
				else if (tip[i] === result[i-1] || tip[i] === result[i+1])	{points += 3;}
			}
			tipper.season_tip = `${points}`;
			tipper.points += points;
			tipper.save();
		}

		tippers = await Tipper.findAll({ order: [ ['season_tip', 'DESC'] ] });
		reply = 'Here are the season tip results:\n';
		for (const tipper of tippers) {
			reply = reply.concat(`\n${tipper.season_tip} - ${tipper.name}`);
		}
		await interaction.channel.send({ content: Formatters.codeBlock(reply) });

		tippers = await Tipper.findAll({ order: [ ['points', 'DESC'] ] });

		reply = 'Here\'s the final SpeedTips scoreboard:\n';
		for (const tipper of tippers) {
			reply = reply.concat(`\n${tipper.points} - ${tipper.name}`);
		}
		return interaction.channel.send({ content: Formatters.codeBlock(reply), ephemeral: true });
	},
};