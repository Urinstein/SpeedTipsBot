const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType }  = require('discord.js');
const { Match } = require('../dbObjects.js');
const { isAdmin, isTeamCaptain, loggingAction, loggingError, submit_result } = require('../index.js');
const { buttons_tip_red } = require('../buttons-presets.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('submitresult')
		.setDescription('[Captains] Submit your match\'s result.'),

	async execute(interaction, client, myGuild, tipping_channel, announcement_channel) {
		try {
			if (!isTeamCaptain(interaction, 'dummy', 'dummy')) { return interaction.editReply({ content: `Only captains can submit results.`}) }

			var matches = null;  //used later
			if (isAdmin(interaction)) {
				matches = await Match.findAll({ include: ['team_a','team_b'] });
			} else {
				matches = await Match.findAll({ include: ['team_a','team_b'] });
			}


			if( matches.length == 0) {return interaction.editReply({ content: 'There are currently no matches.', ephemeral: true })};


			// selection and button
			const select = new StringSelectMenuBuilder().setCustomId('endmatch').setPlaceholder(`Select a match to end.`);
			for (const match of matches) {
				const role_a = await myGuild.roles.cache.get(match.team_a.role_id);
				const role_b = await myGuild.roles.cache.get(match.team_b.role_id);
				select.addOptions([ new StringSelectMenuOptionBuilder().setLabel(`[#${match.id}]  ${role_a.name}   vs   ${role_b.name}`).setValue(`${match.id}`) ])
			}
			const a = await interaction.editReply({ content: null, components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });

			const filter = i => { return true; };

			const collectedSelect = await a?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: ComponentType.StringSelect})
				.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
			if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

			
			// user made a selection
			await loggingAction(`${interaction.user.tag} used /${interaction.commandName} [Match #${collectedSelect.values[0]}]`)

			const match_id = collectedSelect.values[0];
			var match = await Match.findOne({ where: {id: match_id}, include: ['team_a','team_b'] });
			if (!match) return collectedSelect.update({ content: `Match #${match_id} already ended or was deleted.`, ephemeral: true });

			
			const b = await interaction.editReply({ content: `[Match #${match.id}] <@&${match.team_a.role_id}>  -  <@&${match.team_b.role_id}>`, components: [buttons_tip_red] });

			const collectedButton = await b?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: ComponentType.Button})
				.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
			if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


			// user pressed a button
			if (await Match.count({ where: {id: match_id}}) == 0) { return interaction.editReply({ content: `Match #${match_id} result has already been submitted or the match postponed.`, components: [] }) };
			var match = await Match.findOne({ where: {id: match_id}, include: ['team_a','team_b'] });

			await loggingAction(`${interaction.user.tag} used /${interaction.commandName} [Match #${collectedSelect.values[0]}] ${collectedButton.customId}`);


			submit_result(match, collectedButton.customId);


			return

		} catch (error) {
			await loggingError('submitresults.js', `${interaction.user.tag} used /${interaction.commandName}${typeof collectedSelect !== 'undefined' ? (` [Match #${collectedSelect.values[0]}]${typeof collectedButton !== 'undefined' ? ` ${collectedButton.customId}` : '' }`) : '' }`, error);
			return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
		}
	},
};