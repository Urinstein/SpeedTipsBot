const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu }  = require('discord.js');
const { Tipper, Match, Team } = require('../dbObjects.js');
const { printPlayers } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
	.setName('renameteam')
	.setDescription('Change the name of an existing team.')
	.addStringOption(option => option.setName('new_name').setDescription('Enter the team\'s name').setRequired(true)),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		const new_id  = interaction.options.getString('new_name');
		if (Team.count({ where: {id: new_id}}) > 0) return interaction.editReply({ content: 'This team already exists.', ephemeral: true });

		const teams = await Team.findAll();

		const select = new MessageSelectMenu().setCustomId('renameteam').setPlaceholder(`Select a team whose name to change to ${new_id}.`);
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
		
		const old_id = collectedSelect.values[0];

		let matches = await Match.findAll({ where: {team_a_id: old_id}})
		if (matches.length > 0) {
			for (const match of matches) {
				match.team_a_id = new_id; match.save(); 
			}
		}
		matches = await Match.findAll({ where: {team_b_id: old_id}})
		if (matches.length > 0) {
			for (const match of matches) {
				match.team_b_id = new_id; match.save(); 
			}
		}

		let tippers = await Tipper.findAll();
		for (const tipper of tippers) {
			if (tipper.season_tip != null) {
				let season_tip = tipper.season_tip.split("_");
				for (let i=0; i < season_tip.length; i++) {
					if (season_tip[i] == old_id) {
						season_tip[i] = new_id;
						i = season_tip.length;
					}
				}
				tipper.season_tip = season_tip.join("_");
				tipper.save();
			}
		}

		const team = await Team.findOne({ where: {id: old_id}});
		await Team.create({ id: new_id })
		const players = await team.getPlayers();
		for (player of players) {
			player.team_id = new_id;
			await player.save();
		}
		await team.destroy();

		return interaction.editReply({ content: `Team ***${old_id}*** has been renamed to ***${new_id}***.`, components: [] });
	},
};