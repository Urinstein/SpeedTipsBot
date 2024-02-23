const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, strikethrough, codeBlock }  = require('discord.js');
const { Match, Tipper, Static } = require('../dbObjects.js');
const { isAdmin, isTeamCaptain, getName, date_options_very_short } = require('../index.js');
const { Op } = require("sequelize");
const fs = require('node:fs');
const { buttons_tip_red, buttons_tipped_red_closed, buttons_tipped_green_closed, buttons_dm_result } = require('../buttons-presets.js');
const { ernsteen_id } = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('submitresult')
		.setDescription('[Captains] Submit your match\'s result.'),

	async execute(interaction, client, myGuild, tipping_channel, announcement_channel) {
		try {
			if (!isTeamCaptain(interaction, 'dummy', 'dummy')) { return interaction.editReply({ content: `Only captains can submit results.`}) }
			
			var matches = null;  //used later
			if (isAdmin(interaction)) {
				matches = await Match.findAll();
			} else {
				matches = await Match.findAll();
			}

			if( matches.length == 0) {return interaction.editReply({ content: 'There are currently no matches.', ephemeral: true })};


		//#region selection and button
			const select = new StringSelectMenuBuilder().setCustomId('endmatch').setPlaceholder(`Select a match to end.`);
			for (const match of matches) {
				const role_a = await myGuild.roles.cache.get(match.team_a_id);
				const role_b = await myGuild.roles.cache.get(match.team_b_id);
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
			var match = await Match.findOne({ where: {id: match_id} });
			if (!match) return collectedSelect.update({ content: `Match #${match_id} already ended or was deleted.`, ephemeral: true });

			
			const b = await interaction.editReply({ content: `[Match #${match.id}] <@&${match.team_a_id}>  -  <@&${match.team_b_id}>`, components: [buttons_tip_red] });

			const collectedButton = await b?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: ComponentType.Button})
				.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
			if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


			// user pressed a button
			if (await Match.count({ where: {id: match_id}}) == 0) { return interaction.editReply({ content: `Match #${match_id} has already been ended or deleted.`, components: [] }) };
			await match.destroy();	//delete the match already so other people cannot start ending the same match
			var match = await Match.findOne({ where: {id: match_id}, paranoid: false});

			await loggingAction(`${interaction.user.tag} used /${interaction.commandName} [Match #${collectedSelect.values[0]}] ${collectedButton.customId}`);
		//#endregion selection and button


			match.result_a = parseInt(collectedButton.customId);
			match.save();

			// edit interaction reply
			await interaction.editReply({ content: 'Match has been closed', components: [buttons_tipped_red_closed(match.result_a)] });

			// edit announcements and send "match result message"
			tipping_channel.messages.edit( match.tipping_id, { components: [buttons_tipped_green_closed(match.result_a)]} )
			const announcement = await announcement_channel.messages.fetch(match.announcement_id);
			announcement.edit({content: `${strikethrough(announcement.content)}\n\n<@&${match.team_a_id}>  ${match.result_a} - ${4-match.result_a}  <@&${match.team_b_id}>`, components: [] });
			announcement.reply({ content: `Match ended.\n<@&${match.team_a_id}>  ${match.result_a} - ${4-match.result_a}  <@&${match.team_b_id}>`, allowedMentions: {parse: []} });

			
			const static = await Static.findOne();

		//#region edit ended matches post
			const page = Math.ceil(match.id/50);
			const matches_message_id = static[`allmatches${page}_id`];

			reply = `[Matches #${50*(page-1)+1} to #${50*(page)}]`;
			const ended_matches = await Match.findAll({ where: { deletedAt: {[Op.not]: null}, id: {[Op.between]: [50*(page-1)+1, 50*page]} }, paranoid: false })
			for (const match of ended_matches) {
				reply = reply.concat(`\n[#${match.id}] ${match.deletedAt.toLocaleString("en-GB", date_options_very_short)} <@&${match.team_a_id}>  ${match.result_a} - ${4-match.result_a}  <@&${match.team_b_id}>`);
			}
			await announcement_channel.messages.edit(matches_message_id, reply);

		//#endregion edit ended matches post


			// for short notice matches, nothing more needs to be done
			if(match.is_short_notice) { return match.destroy() }
			

		//#region post Points and DMs
			const tips = await match.getTips();
			if (tips.length == 0) {
				await tipping_channel.send({content: `Here is the result of [Match #${match.id}] <@&${match.team_a_id}>  ${match.result_a} - ${4-match.result_a}  <@&${match.team_b_id}>\nNo one made a tip on this match. C'mon guys!`, allowedMentions: {parse: []} });
				match.destroy();
			} else {
				let result_diff = 2*match.result_a - 4;
				let threeP = new Array();
				let oneP = new Array();
				let zeroP = new Array();

				for (const tip of tips) {
					const tip_diff = 2*tip.score_a - 4;
					const tipper = await tip.getTipper();
					
					if (result_diff == tip_diff) {
						tipper.points += 3;
						if(match.result_a == 2) {tipper.points += 1;}
						threeP = threeP.concat(`${await getName(tipper.id)}`);
					} else if (Math.sign(result_diff) == Math.sign(tip_diff))   {
						tipper.points += 1;
						oneP =   oneP.concat(`${await getName(tipper.id)}`);
					} else {
						zeroP =  zeroP.concat(`${await getName(tipper.id)}`);
					}

					if (tip.dm_id != null) {
						const user = await client.users.cache.get(tipper.id);
						await user.createDM();
						const dm = await user.dmChannel.messages.fetch(tip.dm_id);
						
						await dm.edit({ components: [buttons_dm_result(tip.score_a, match.result_a)] })
					}

					tipper.save();
					await tip.destroy();
				}

				let reply = `📊  **Here is the result of [Match #${match.id}] <@&${match.team_a_id}>  ${match.result_a} - ${4-match.result_a}  <@&${match.team_b_id}>**\n`;
				if (match.result_a == 2) {
					reply = reply.concat(`▬▬▬▬▬▬▬▬▬▬▬▬▬\n**4 Points go to:**\n> ${threeP.sort().join(", ")}\n\n**NO Points go to:**\n> ${zeroP.sort().join(", ")}\n▬▬▬▬▬▬▬▬▬▬▬▬▬`);
				} else {
					reply = reply.concat(`▬▬▬▬▬▬▬▬▬▬▬▬▬\n**3 Points go to:**\n> ${threeP.sort().join(", ")}\n\n**1 Point goes to:**\n> ${oneP.sort().join(", ")}\n\n**NO Points go to:**\n> ${zeroP.sort().join(", ")}\n▬▬▬▬▬▬▬▬▬▬▬▬▬`);
				}

				tipping_channel.send({ content: reply, allowedMentions: {parse: []} });
			}
		//#endregion post Points and DMs


			const tippers = await Tipper.findAll({ order: [ ['points', 'DESC'] ] });

			// edit scoreboard
			reply = 'Here\'s the current SBL#7 SpeedTips scoreboard:';
			for (const tipper of tippers) {
				const total_tips = await tipper.countTips({ where: {deletedAt: {[Op.not]: null}}, paranoid: false });
				reply = reply.concat(`\n${tipper.points} (${total_tips}) - ${await getName(tipper.id)}`);
			}
			await tipping_channel.messages.edit(static.scoreboard_id, codeBlock(reply));


//#region edit stats
			reply = 'tipping statistics   (total/3pts/1pt)\n  total   -    4-0     -    3-1     -    2-2\n';
			var i = 0;

			function space(arg) {		//add some spaces to line up the columns
				if(arg<10) {return ` ${arg}`;}
				else return arg;
			}

			for (const tipper of tippers) {
				i++;
				const tips = await tipper.getTips(({ where: {deletedAt: {[Op.not]: null}}, paranoid: false }));
				
				var total = 0; 			var total_3p = 0; 	var total_1p = 0;
				var tip4_total = 0; 	var tip4_3p = 0; 	var tip4_1p = 0;
				var tip3_total = 0; 	var tip3_3p = 0; 	var tip3_1p = 0;
				var tipdraw_total = 0;	var tipdraw_3p = 0; var tipdraw_1p = 0;

				for (const tip of tips) {
					var match = await tip.getMatch({ paranoid: false});

					var result_diff = 2*match.result_a - 4;
					var tip_diff = 2*tip.score_a - 4;

					pts3 = 0;
					pts1 = 0;

					if (result_diff == tip_diff) {pts3 = 1; total_3p++;
					} else if (Math.sign(result_diff) == Math.sign(tip_diff)) {pts1 = 1; total_1p++;
					}

					if (tip.score_a == 4 || tip.score_a == 0) {
						tip4_total++;
						tip4_3p += pts3;
						tip4_1p += pts1;
					} else if (tip.score_a == 3 || tip.score_a == 1) {
						tip3_total++;
						tip3_3p += pts3;
						tip3_1p += pts1;
					} else if (tip.score_a == 2) {
						tipdraw_total++;
						tipdraw_3p += pts3;
						tipdraw_1p += pts1;
					}
					total++;
				}

				reply = reply.concat(`\n${space(total)}/${space(total_3p)}/${space(total_1p)}  -  ${space(tip4_total)}/${space(tip4_3p)}/${space(tip4_1p)}  -  ${space(tip3_total)}/${space(tip3_3p)}/${space(tip3_1p)}  -  ${space(tipdraw_total)}/${space(tipdraw_3p)}  -  ${i}) ${await getName(tipper.id)}`);
			}
			await tipping_channel.messages.edit(static.stats_id, codeBlock(reply));
//#endregion edit stats


			return

		} catch (error) {
			await loggingError('submitresults.js', `${interaction.user.tag} used /${interaction.commandName}${typeof collectedSelect !== 'undefined' ? (` [Match #${collectedSelect.values[0]}]${typeof collectedButton !== 'undefined' ? ` ${collectedButton.customId}` : '' }`) : '' }`, error);
			return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
		}
	},
};