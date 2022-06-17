const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu, MessageButton }  = require('discord.js');
const { Tipper, Team } = require('../dbObjects.js');
const { printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('seasontip')
		.setDescription('Make a tip on the overall result of the league.'),

	async execute(interaction, tipper) {
		let collected = null;

		const filter = i => { return i.message.interaction.id === interaction.id; };

		if (tipper != null && tipper.season_tip != null && tipper.points > 0) {
			let buttons = new MessageActionRow().addComponents(
				new MessageButton().setCustomId(`ok`).setLabel('I understand').setStyle('DANGER'),
				new MessageButton().setCustomId(`no`).setLabel('I\'d rather not').setStyle('SECONDARY'),
			)
			let list = 'Your current season tip:\n'
			let tip = tipper.season_tip.split('_')
			for (let i = 0; i < tip.length; i++) { list = list.concat(`\n${i+1}) ${tip[i]}`); }
			await interaction.editReply({ content: `***Changing your league tip will reset your points to 0.***\n\`\`\`${list}\`\`\``, components: [buttons], ephemeral: true });

			collected = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'BUTTON'})
				.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
			if (collected.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}
			if (collected.customId == 'no') {return collected.update({ content: 'Alright.', components: [] })}
		}
		else {
			let buttons = new MessageActionRow().addComponents(
				new MessageButton().setCustomId(`letsgo`).setLabel('Let\'s go').setStyle('SUCCESS'),
			)
			await interaction.editReply({ content: '***Make a season tip for big potential points at the end of the season.***', components: [buttons], ephemeral: true });

			collected = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'BUTTON'})
				.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
			if (collected.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}
		}

		let season_tip = '';
		let reply = ``
		let teams = await Team.findAll();
		let length = teams.length;

		for (let i = 0; i < length; i++) {
			const select = new MessageSelectMenu().setCustomId(`leaguetip_${i}`).setPlaceholder(`Select a team for position #${i+1}`);
			
			for (let j = 0; j < teams.length; j++) {
				select.addOptions([ {label: teams[j].id, description: await printPlayers(teams[j]), value: `${j}`} ])
			}
			await collected.update({ content: `Your league tip:\n\`\`\`\n${reply}\`\`\`\n`, components: [new MessageActionRow().addComponents(select)] });

			collected = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
				.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) });
			if (collected.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

			season_tip = season_tip.concat(`${teams[parseInt(collected.values[0])].id}_`);
			reply = reply.concat(`\n${i+1}) ${teams[parseInt(collected.values[0])].id}`);
			teams.splice(parseInt(collected.values[0]), 1);
		}

		if (!tipper) {
			var name = '';
			if	(interaction.member.nickname != null) 	{name = interaction.member.nickname;}
			else 										{name = interaction.user.username;}
			tipper = await Tipper.create({ id: interaction.user.id, name: name });
		}

		if (tipper.season_tip != null && tipper.points > 0) {
			let reply_plus = `Your league tip:\n\`\`\`\n${reply}\`\`\`\n***Changing your league tip will reset your points to 0.\nYou would lose ${tipper.points} points.***`;
			let buttons = new MessageActionRow().addComponents(
				new MessageButton().setCustomId(`ok`).setLabel('Confirm').setStyle('DANGER'),
				new MessageButton().setCustomId(`no`).setLabel('Nevermind').setStyle('SECONDARY'),
			)
			await collected.update({ content: reply_plus, components: [buttons] });

			collected = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'BUTTON'})
				.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
			if (collected.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

			if (collected.customId == 'no') {return collected.update({ content: 'Alright', components: [] })}
			tipper.points = 0;
		}
		tipper.season_tip = season_tip.slice(0,-1);
		tipper.save();

		const tips = await tipper.getTips({ paranoid: false});
		for (const tip of tips) { tip.destroy({force: true}); }

		let reply_plus = `Your league tip:\n\`\`\`\n${reply}\`\`\`\n***Your league tip has been ${(tipper.season_tip != null ? 'updated' : 'saved')}.***`;
		return collected.update({ content: reply_plus, components: [] });
	},
};