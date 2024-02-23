const { SlashCommandBuilder } = require('@discordjs/builders');
const { ComponentType, codeBlock }  = require('discord.js');
const { Op } = require("sequelize");
const fs = require('node:fs');
const { closeMatch, isTeamCaptain, createTip, loggingAction, loggingError, date_options } = require('../index.js');
const { Match, Tipper, Tip } = require('../dbObjects.js');
const { buttons_tip, button_open, buttons_tip_closed, button_short_notice, buttons_announcement, buttons_warning } = require('../buttons-presets.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('schedulematch')
		.setDescription('[Captains] Announces your match.')
        .addIntegerOption(	option => option.setName('id')		.setDescription('match #number')				.setRequired(true))
        .addRoleOption(		option => option.setName('team-a')	.setDescription('Team A')						.setRequired(true))
        .addRoleOption(		option => option.setName('team-b')	.setDescription('Team B')						.setRequired(true))
        .addIntegerOption(	option => option.setName('hour')	.setDescription('hour')			.setMaxValue(23).setRequired(true))
        .addIntegerOption(	option => option.setName('minute')	.setDescription('minute')		.setMaxValue(60).setRequired(true))
        .addIntegerOption(	option => option.setName('day')		.setDescription('day')			.setMaxValue(31).setRequired(true))
        .addIntegerOption(	option => option.setName('month')	.setDescription('month')		.setMaxValue(12).setRequired(true))
        .addIntegerOption(	option => option.setName('year')	.setDescription('year')
			.addChoices(
				{name: `${new Date(Date.now()).getFullYear()}`, value: new Date(Date.now()).getFullYear()},
				{name: `${new Date(Date.now()).getFullYear()+1}`, value: new Date(Date.now()).getFullYear()+1}
			))
		,

	async execute(interaction, client, myGuild, speedtips_channel, announcement_channel) {

		try {
			if(interaction.channel != announcement_channel) {return interaction.editReply({ content: `This command can only be used in #matches (make a link)` })}
			if (!isTeamCaptain(interaction, 'dummy', 'dummy')) { return interaction.editReply({ content: `Only captains can schedule their own matches.`}) }

			const role_a = interaction.options.getRole('team-a');
			const role_b = interaction.options.getRole('team-b');
			if (!isTeamCaptain(interaction, role_a, role_b)) { return interaction.editReply({ content: `Your can schedule your own matches.`}) }

			const day = interaction.options.getInteger('day');
			const month = interaction.options.getInteger('month');
			const year = interaction.options.getInteger('year');
			const hour = interaction.options.getInteger('hour');
			const minute = interaction.options.getInteger('minute');
			const time = new Date(`${(year ? year : (new Date(Date.now())).getFullYear())}-${month}-${day} ${hour}:${minute}`);
			if (isNaN(time)) {return interaction.editReply({ content: `The date is not formatted correctly.` })};
			const is_short_notice = (Date.now()/*+(6*60*60*1000)*/> time.getTime()) ? true : false;
			const is_open = !(Date.now() > time.getTime()) ? true : false;

			const match_id = interaction.options.getInteger('id');
			var match = await Match.findOne({ where: {id: match_id} });
			const cancelled_match = await Match.findOne({ where: {id: match_id, deletedAt: {[Op.not]: null}}, paranoid: false});

			var message = `[Match #${match_id}]  <@&${role_a.id}>  -  <@&${role_b.id}>\n${await role_a.members.map(m=>m.displayName).join(', ')} - ${await role_b.members.map(m=>m.displayName).join(', ')}\n${time.toLocaleString("en-GB", date_options)}`;


		//#region NEW MATCH
			try {
				if (!cancelled_match && !match) {
					await loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${match_id}] (new) ${time.toLocaleString("en-GB", date_options)}`)

					match = await Match.create({
						id: 			match_id,
						team_a_id: 		interaction.options.getRole('team-a').id,
						team_b_id: 		interaction.options.getRole('team-b').id,
					});

					match.time = time;
					match.is_open = !is_short_notice;
					match.is_short_notice = is_short_notice;


					// send announcements
					const announcement = await announcement_channel.send({ content: message, components: [buttons_announcement], allowedMentions: {parse: []} });		//remove , allowedMentions: {parse: []} 
					match.announcement_id = announcement.id;
					const tipping = await speedtips_channel.send({ content: `'`+message, components: (match.is_open ? [button_open, buttons_tip] : [button_short_notice, buttons_tip_closed]), allowedMentions: {parse: []}});
					match.tipping_id = tipping.id;
					match.save();
					
					// send tips
					if (match.is_open) {
						const tippers = await Tipper.findAll({where: {dm_ann: true}});
						for (const tipper of tippers) {
							createTip (interaction, match.id);
						}
					}
					
					// the bot tips randomly
					const botTip = await Tip.create({
						tipper_id:	client.user.id,
						match_id:	match_id,
						score_a:	Math.floor(5*Math.random())
					})

					interaction.editReply({ content: `Successfully added Cup` });
					return
				}
			} catch (error) {
				await loggingError('schedulematch.js #region NEW MATCH', `${interaction.user.tag} used /${interaction.commandName}`, error);
				return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
			}
		//#endregion NEW MATCH

		//#region RE ANNOUNCEMENT
			try{
				if (!match) {
					await loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${match_id}] (re-announcement) ${time.toLocaleString("en-GB", date_options)}`)

					// send announcements
					const announcement = await announcement_channel.send({ content: message, components: [buttons_announcement], allowedMentions: [{}] });	//remove , allowedMentions: [{}] 
					match.announcement_id = announcement.id;
					const tipping = await speedtips_channel.send({ content: message, components: (match.is_open ? [button_open, buttons_tip] : [button_short_notice, buttons_tip_closed]), allowedMentions: {parse: []}});
					match.tipping_id = tipping.id;
					match.save()

					// create tips
					if (match.is_open) {
						const tippers = await Tipper.findAll();
						for (const tipper of tippers) {
							createTip (interaction, tipper, match);
						}
					}

					interaction.editReply({ content: `Successfully added Cup` });
					return
				}
			} catch (error) {
				await loggingError('schedulematch.js #region RE ANNOUNCEMENT', `${interaction.user.tag} used /${interaction.commandName}`, error);
				return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
			}

		//#endregion RE ANNOUNCEMENT

		//#region RESCHEDULE
			try {
				// if (match) {		//unneeded
				await loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${match_id}] (re-schedule) ${time.toLocaleString("en-GB", date_options)}`)

				// reschedule warning buttons
				const a = await interaction.editReply({ content: `Are you sure you wish to reschedule [Match #${match.id}]?\nFrom:  <@&${match.team_a_id}>  -  <@&${match.team_b_id}>  -  ${match.time.toLocaleString("en-GB", date_options)}\nTo:    <@&${role_a.id}>  -  <@&${role_b.id}>  -  ${time.toLocaleString("en-GB", date_options)}\n\nIf this is wrong, people might get pissed.`, components: [buttons_warning] })

				const filter = i => { return true };

				const collectedButton = await a?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: ComponentType.Button})
					.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
				if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

				// user pressed a button
				if(collectedButton.customId == 'b_nevermind') {
					interaction.editReply({ content: 'Good choice.', components: [] })
					return
				}

				const announcement = await announcement_channel.messages.fetch(match.announcement_id);
				const tipping = await speedtips_channel.messages.fetch(match.tipping_id);

				// update match and announcements
				match.time = time;
				match.team_a_id = interaction.options.getRole('team-a').id;
				match.team_b_id = interaction.options.getRole('team-b').id;
				match.save();

				announcement.reply(`This match has been rescheduled to **${time.toLocaleString("en-GB", date_options)}**`);
				announcement.edit(message);
				tipping.edit(`'`+message);


				// handling different states
				if ( match.is_open && !is_open ) {
					closeMatch(client, match, speedtips_channel)
					return
				}
				else if ( !match.is_open && !is_short_notice ) {
					tipping.edit({ content: message, components: [button_open, buttons_tip]});
					tipping.reply('This match has been reopened');

					// create tips
					const tippers = await Tipper.findAll({ where: { dm_ann: true } });
					for (const tipper of tippers) {
						createTip (interaction, tipper, match);
					}

					match.is_open = true;
					match.is_short_notice = is_short_notice;
					match.save()
					return
				}
				match.is_open = !is_short_notice;
				match.is_short_notice = is_short_notice;
				match.save()

				interaction.editReply({ content: 'The match has been successfully rescheduled.', components: [] })

				return	// if ( (!match.is_open && is_short_notice) || (match.is_open && is_open))

			} catch (error) {
				await loggingError('schedulematch.js # RESCHEDULE', `${interaction.user.tag} used ${interaction.commandName}${typeof collectedButton !== 'undefined' ? ` and ${collectedButton.customId}` : '' }`, error);
				return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
			}
			
		//#endregion RESCHEDULE

		} catch (error) {
			await loggingError('schedulematch.js', `${interaction.user.tag} used /${interaction.commandName}`, error)
			return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
		}

	},
};