const { Client, Collection, GatewayIntentBits, ComponentType, codeBlock, strikethrough, inlineCode }  = require('discord.js');
const { Op } = require("sequelize");
const fs = require('node:fs');
const { token, guildId, janitor_guild_id, janitor_channel_id, announcement_channel_id, tipping_channel_id, updates_channel_id, admin_role_id, captain_role_id, event_name, event_type, event_number, teams_config, has_divisions  } = require('./config.json');
const { Tip, Tipper, Match, Team, Static } = require('./dbObjects.js');
const { buttons_tip, buttons_tip_closed, buttons_tipped, button_closed, button_cancelled, button_dm_setting_ann, button_dm_setting_tips, button_dm_none, button_register, buttons_warning, button_postponed, button_postpone, buttons_tipped_closed, button_phase_2, button_end_event, buttons_tipped_green_closed, buttons_dm_result, button_initialise } = require('./buttons-presets.js');


// global variables
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
var myGuild = null;
var tipping_channel = null;
var announcement_channel = null;
var updates_channel = null;
var janitor_channel = null;
var registration_message = null;
var captain_message = null;
var scoreboard_message = null;
var stats_message = null;
var static = null;
var team_roles = [];


//#region FUNCTIONS

async function announce_match (interaction, match, time, is_short_notice) {
	loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${indent(match.id, 3, '0')}] (announce) ${time.toLocaleString("en-GB", date_options)}`);
	if(match.result_a) {
		loggingAction('but the match has already been played');
		return interaction.editReply({ content: `This match has already been played.` })
	}

	// send warning
	const a = await interaction.editReply({ 
		content: 
		`Are you sure you wish to schedule [Match #${indent(match.id, 3, '0')}]?\n<@&${match.team_a.role_id}>  -  <@&${match.team_b.role_id}>  -  ${time.toLocaleString("en-GB", date_options)}`,
		components: [buttons_warning]
	})

	const filter = i => { return true };
	const collectedButton = await a?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: ComponentType.Button})
		.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
	if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}
	
	// user pressed a button
	await loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${indent(match.id, 3, '0')}] (announce) ${time.toLocaleString("en-GB", date_options)} and ${collectedButton.customId}`)
	if(collectedButton.customId == 'b_nevermind') {
		interaction.editReply({ content: 'Good choice.', components: [] })
		return
	}

	
	// update match
	match.time = time;
	match.is_open = !is_short_notice;
	match.is_short_notice = is_short_notice;
	match.is_cancelled = false;

	let now = new Date(Date.now());
	match.history = (`\n${now.toLocaleString("en-GB", date_options_short)} <@${interaction.user.id}>: Match was ${match.time ? 're' : ''}scheduled for ${time.toLocaleString("en-GB", date_options_short)}`).concat(match.history);

	var message = `[Match #${indent(match.id, 3, '0')}] <@&${match.team_a.role_id}> - <@&${match.team_b.role_id}>`;

	
	// updates
	await announcement_channel.messages.edit(match.announcement_id, { content: message+match.history, allowedMentions: {roles: [match.team_a.role_id, match.team_b.role_id]} })

	if (match.is_open) {
		let tipping_message = `'`+message+`\n${await team_roles[match.team_a.id].members.map(m=>m.displayName).join(', ')} - ${await team_roles[match.team_b.id].members.map(m=>m.displayName).join(', ')}\n${time.toLocaleString("en-GB", date_options)}`
		const tipping = await tipping_channel.send({ content: tipping_message, components: [buttons_tip], allowedMentions: {parse: []}});
		match.tipping_id = tipping.id;
	}
	let update = await updates_channel.send(
		message+`https://discord.com/channels/${guildId}/${announcement_channel_id}/${match.announcement_id}`
		+`\nMatch was ${match.time ? 're' : ''}scheduled for ${time.toLocaleString("en-GB", date_options_short)}`
	)
	if (match.latest_update_id) {
		await updates_channel.messages.delete(match.latest_update_id);
	}
	match.latest_update_id = update.id;

	await match.save();
	await match.restore()
		
	await print_team_matches(match.team_a);
	await print_team_matches(match.team_b);

	// create tips
	if (match.is_open) {
		const tippers = await Tipper.findAll();
		for (const tipper of tippers) {
			createTip (interaction, tipper, match);
		}
	}

//	return sendDate(match);
	interaction.editReply({ content: `Successfully scheduled [Match #${indent(match.id, 3, '0')}].`, components: [] });
	return
}

async function cancel_match (interaction, match) {
	await loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${indent(match.id, 3, '0')}] (cancel)`);

	var message = `[Match #${indent(match.id, 3, '0')}]  <@&${match.team_a.role_id}>  -  <@&${match.team_b.role_id}>}`;

	// cancel warning buttons
	const warning = await interaction.editReply({ content: `Are you sure you wish to CANCEL [Match #${indent(match.id, 3, '0')}]  <@&${match.team_a.role_id}>  -  <@&${match.team_b.role_id}>?`, components: [buttons_warning] })

	const filter = i => { return true };

	const collectedButton = await warning?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: ComponentType.Button})
		.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
	if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

	// user pressed a button
	await loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${indent(match.id, 3, '0')}] (cancel) and ${collectedButton.customId}`)
	if(collectedButton.customId == 'b_nevermind') {
		interaction.editReply({ content: 'Good choice.', components: [] })
		return
	}

	
	// update match
	let now = new Date(Date.now());
	match.is_cancelled = true;
	match.is_short_notice = false;
	match.is_open = true;
	match.history = (`\n${now.toLocaleString("en-GB", date_options_short)} <@${interaction.user.id}>: Match was cancelled.`).concat(match.history);

	var message = `[Match #${indent(match.id, 3, '0')}] <@&${match.team_a.role_id}> - <@&${match.team_b.role_id}>`;

	//updates
	await announcement_channel.messages.edit(match.announcement_id, { content: message+match.history, allowedMentions: {parse: []} })

	let update = await updates_channel.send(
		message+`https://discord.com/channels/${guildId}/${announcement_channel_id}/${match.announcement_id}`
		+`\nMatch was cancelled.`
	);
	if (match.latest_update_id) {
		await updates_channel.messages.delete(match.latest_update_id);
	}
	match.latest_update_id = update.id;


	// soft delete tips
	const tips = await match.getTips();
	for (const tip of tips) {
		if (tip.dm_id){
			const user = await client.users.fetch(tip.tipper_id);
			user.dmChannel.messages.edit(tip.dm_id, {content: `[Match #${indent(match.id, 3, '0')}]\nThe match was cancelled.`, components: []});
			tip.dm_id = null; tip.save();
		}
		tip.destroy();
	}
	if (match.tipping_id) {	
		await tipping_channel.messages.delete(match.tipping_id);
		match.tipping_id = null;
	}	
	await match.save(); await match.destroy();
	
	await print_team_matches(match.team_a);
	await print_team_matches(match.team_b);

//	return sendDate(match);
	interaction.editReply({ content: `Successfully cancelled [Match #${indent(match.id, 3, '0')}]`, components: [] })

	advance_phase();
	
	return
}

async function reschedule_match (interaction, match, time, is_short_notice, is_open) {
	await loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${indent(match.id, 3, '0')}] (reschedule) ${time.toLocaleString("en-GB", date_options)}`);
	if(match.result_a) {
		loggingAction('but the match has already been palyed');
		return interaction.editReply({ content: `This match has already been played.` })
	}

	// reschedule warning buttons
	const warning = await interaction.editReply({ content: `Are you sure you wish to reschedule [Match #${indent(match.id, 3, '0')}]  <@&${match.team_a.role_id}>  -  <@&${match.team_b.role_id}>?\nFrom: ${match.time.toLocaleString("en-GB", date_options)}\nTo: ${time.toLocaleString("en-GB", date_options)}`, components: [buttons_warning] })

	const filter = i => { return true };

	const collectedButton = await warning?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: ComponentType.Button})
		.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
	if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

	// user pressed a button
	await loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${indent(match.id, 3, '0')}] (reschedule) ${time.toLocaleString("en-GB", date_options)} and ${collectedButton.customId}`)
	if(collectedButton.customId == 'b_nevermind') {
		interaction.editReply({ content: 'Good choice.', components: [] })
		return
	}


	// update match and announcements
	match.time = time;

	let now = new Date(Date.now());
	match.history = (`\n${now.toLocaleString("en-GB", date_options_short)} <@${interaction.user.id}>: Match was rescheduled for ${time.toLocaleString("en-GB", date_options_short)}`).concat(match.history);
	await match.save();

	var message = `[Match #${indent(match.id, 3, '0')}] <@&${match.team_a.role_id}> - <@&${match.team_b.role_id}>`;

	// announcement
	await announcement_channel.messages.edit(match.announcement_id, { content: message+match.history, allowedMentions: {parse: []} })

	//updates
	let update = await updates_channel.send(
		message+`https://discord.com/channels/${guildId}/${announcement_channel_id}/${match.announcement_id}`
		+`\nMatch was rescheduled for ${time.toLocaleString("en-GB", date_options_short)}`
	)
	if (match.latest_update_id) {
	await updates_channel.messages.delete(match.latest_update_id);
	}
	match.latest_update_id = update.id;


	let tipping_message = `'`+message+`\n${await team_roles[match.team_a.id].members.map(m=>m.displayName).join(', ')} - ${await team_roles[match.team_b.id].members.map(m=>m.displayName).join(', ')}\n${time.toLocaleString("en-GB", date_options)}`


	// handling different states for tipping

 	//open match rescheduled into short notice
	if (!match.is_short_notice && is_short_notice
		&& (!is_open && match.time.getTime()+short_notice_length > time.getTime()
			|| match.time.getTime()+short_notice_length > now.getTime()) ) {

		const tips = await match.getTips();
		for (const tip of tips) {
			if (tip.dm_id){
				const user = await client.users.fetch(tip.tipper_id);
				user.dmChannel.messages.edit(tip.dm_id, {content: `[Match #${indent(match.id, 3, '0')}]\nThe match was rescheduled into short notice.`, components: []});
				tip.dm_id = null; tip.save();
			}
			tip.destroy();
		}
		
		match.is_short_notice = true;
		match.is_open = false;

		await tipping_channel.message.delete(match.tipping_id);
		match.tipping_id = null;
		await match.save();
	}
	// open match is closed (but not into short notice)
	else if (match.is_open && !is_open) {
		closeMatch(match);
	}
	// closed (but already announced) match is opened
	else if (!match.is_open && !match.is_short_notice && !is_short_notice){
		match.is_open = true;
		match.is_short_notice = false;
		
		await tipping_channel.edit(match.tipping_id, { content: tipping_message, components: [buttons_tip], allowedMentions: {parse: []}});
	
		// create tips
		const tippers = await Tipper.findAll();
		for (const tipper of tippers) {
			createTip (interaction, tipper, match);
		}
	}

	await match.save()

	await print_team_matches(match.team_a);
	await print_team_matches(match.team_b);

//	return sendDate(match);
	return interaction.editReply({ content: `Successfully rescheduled [Match #${indent(match.id, 3, '0')}].`, components: [] })
}

async function postpone_match (interaction, match) {
	try {
		await loggingAction(`${interaction.user.tag} used /${interaction.commandName}: [Match #${indent(match.id, 3, '0')}] (postpone)`);
		if(match.result_a) {
			loggingAction('but the match has already been played');
			return interaction.editReply({ content: `This match has already been played.` })
		}
		
		// send warning
		const a = await interaction.editReply({ 
			content: 
			`Are you sure you wish to POSTPONE [Match #${indent(match.id, 3, '0')}]?\n<@&${match.team_a.role_id}>  -  <@&${match.team_b.role_id}>`,
			components: [buttons_warning] 
		})

		const filter = i => { return true };
		const collectedButton = await a?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: ComponentType.Button})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user pressed a button (confirm/nevermind)
		loggingAction(`${interaction.user.tag} pressed ${interaction.customId} [Match #${indent(match.id, 3, '0')}] and ${collectedButton.customId}`);

		if(collectedButton.customId == 'b_nevermind') {
			interaction.editReply({ content: 'Good choice.', components: [] })
			return
		}

		// update match
		let now = new Date(Date.now());
		match.time = null;
		match.is_short_notice = false;
		match.is_open = true;
		match.history = (`\n${now.toLocaleString("en-GB", date_options_short)} <@${interaction.user.id}>: Match was postponed`).concat(match.history);
		await match.save();

		var message = `[Match #${indent(match.id, 3, '0')}] <@&${match.team_a.role_id}> - <@&${match.team_b.role_id}>`;

		//updates
		await announcement_channel.messages.edit(match.announcement_id, { content: message+match.history, allowedMentions: {parse: []} })

		let update = await updates_channel.send(
			message+`https://discord.com/channels/${guildId}/${announcement_channel_id}/${match.announcement_id}`
			+`\nMatch was postponed.`
		);
		if (match.latest_update_id) {
			await updates_channel.messages.delete(match.latest_update_id);
		}
		match.latest_update_id = update.id;

		await print_team_matches(match.team_a);
		await print_team_matches(match.team_b);


		// soft delete tips
		const tips = await match.getTips();
		for (const tip of tips) {
			if (tip.dm_id){
				const user = await client.users.fetch(tip.tipper_id);
				user.dmChannel.messages.edit(tip.dm_id, {content: `[Match #${indent(match.id, 3, '0')}]\nThe match was  postponed.`, components: []});
				tip.dm_id = null; tip.save();
			}
			tip.destroy();
		}

		await tipping_channel.messages.delete(match.tipping_id);
		match.tipping_id = null;
		await match.save(); await match.destroy();

//		return sendDate(match);
		interaction.editReply({ content: `Successfully postponed [Match #${indent(match.id, 3, '0')}].`, components: [] });
		return
	} catch (error) {
		await loggingError('b_postpone_match', `${interaction.user.tag} pressed ${interaction.customId}${typeof collectedButton !== 'undefined' ? ` and ${collectedButton.customId}` : '' }`, error);
		return interaction.editReply({ content: `There was an error while executing this command!\nThe error has been submitted`, components: [] });
	}
}

async function closeMatch (match) {
	if (!match.is_open) {return}
	match.is_open = false;
	match.save();

	tipping_channel.messages.edit( match.tipping_id, { components: [button_closed, buttons_tip_closed]} );

	const tips = await Tip.findAll( { where: {match_id: match.id} } )
	for (const tip of tips) {
		if (tip.dm_id) {
			const user = client.users.cache.get(tip.tipper_id);
			user.dmChannel.messages.edit(tip.dm_id, { components: [buttons_tipped_closed(tip.score_a)] })
		}
	}

	if(!match.is_short_notice && !match.is_cancelled) {postTips(match);}

	loggingAction(`[Match #${indent(match.id, 3, '0')}] closed.`);
	return
}

async function createTip (interaction, tipper, match) {
	try {
		//if (match.is_short_notice || tipper.id == client.user.id) {return}
		if (match.is_short_notice) {return}

		// // tip back-end
		var tip = await Tip.findOne({ where: { tipper_id: tipper.id, match_id: match.id }, paranoid: false });
		if (!tip) {
			tip = await Tip.create({ tipper_id: tipper.id, match_id: match.id });
		} else { tip.restore();}

		if (['0','1','2','3','4'].includes(interaction.customId)) {
			tip.score_a = interaction.customId;
			await tip.save();
			(interaction.channel.isDMBased() ? tipper.dm_tips++ : tipper.channel_tips++);
			tipper.save();
		}


		// // tip front-end
		
		// find or send the tip dm
		var dm = null;
		const user = await client.users.fetch(tipper.id);

		if (tip.dm_id == null && !tipper.dm_setting_tips) {
			return
		}
		else if (tip.dm_id == null && tipper.dm_setting_tips) {
			dm = await user.dmChannel.send({
				content: `You can now tip on [Match #${indent(match.id, 3, '0')}]`
			});
			tip.dm_id = dm.id; tip.save();
		} else {
			dm = await user.dmChannel.messages.fetch(tip.dm_id);
		}

		// edit the tip dm
		//const role_a = await myGuild.roles.cache.get(match.team_a.role_id);
		//const role_b = await myGuild.roles.cache.get(match.team_b.role_id);
		await dm.edit({
			content: `'[Match #${indent(match.id, 3, '0')}]  ${team_roles[match.team_a.id].name} - ${team_roles[match.team_b.id].name}\n${await team_roles[match.team_a.id].members.map(m=>m.displayName).join(', ')} - ${await team_roles[match.team_b.id].members.map(m=>m.displayName).join(', ')}\n${match.time.toLocaleString("en-GB", date_options)}`,
			components: [(match.is_open ? buttons_tipped(tip.score_a) : buttons_tip_closed)] //this takes into account if the match is posted as closed, but this is prevented in /announcematch
		})

	} catch (error) {
		// this error message needs some work, for when someone scheduled a match
		await loggingError('createTip()', `${interaction.user.tag} tipped "${interaction.customId}" on Match #${indent(match.id, 3, '0')} in ${(interaction.channel.isDMBased() ? 'dm_channel' : 'tipping_channel')}`, error);
		return interaction.editReply({ content: `There was an error while executing this command!\nThe error has been submitted.`, components: [], ephemeral: true  });
	}
}

async function generate_first_leg () {
	if (static.phase == 1) {
		loggingAction("\n\nGenerating Phase 1\n");
	}
	const teams = await Team.findAll();
	const teams_concat = teams.concat(teams);
	var match_id = 0;

	for (let home_team = 0; home_team <= teams.length-1; home_team++) {
		const out_teams = teams_concat.slice(home_team+1, home_team+1 + home_matches(teams, home_team));

		for (const out_team of out_teams) {
			const team_a = teams[home_team];
			const team_b = out_team;
			loggingAction(`#${++match_id}: ${team_roles[team_a.id].name} - ${team_roles[team_b.id].name}`);
			
			
			const match = await Match.create({ id: match_id });
			await match.setTeam_a(team_a);
			await match.setTeam_b(team_b);

			await match.destroy();

			// the bot tips randomly
			bot_tip(match_id)
		}
	}

	static.save();

}

async function generate_second_leg () {
	const matches = await Match.findAll({ paranoid: false, include: ['team_a','team_b'] });
	let match_id = matches.length;

	for (const first_match of matches) {
		const second_match = await Match.create({id: ++match_id});
		await second_match.setTeam_a(first_match.team_b.id);
		await second_match.setTeam_b(first_match.team_a.id);

		loggingAction(`#${second_match.id}: ${team_roles[second_match.team_a.id].name} - Team #${team_roles[second_match.team_b.id].name}`);

		// the bot tips randomly
		bot_tip (match_id)
	}
}

async function generate_phase_2 () {

	for (const team_config of teams_config) {
		const team = await Team.findOne({where: {id: team_config.id}});
		team.div = team_config.div; team.save();
	}

	const teams = await Team.findAll();
	const teams_concat = teams.concat(teams);

	for (let div = 1; div<=2; div++) {

		loggingAction(`\n\nPhase 2 - DIVISION ${div}\n`);
	
		const div_teams = teams.filter( (team) => team.div == div);
		const div_teams_concat = div_teams.concat(div_teams);
		var match_id = 100*div;
	
		for (let home_team = 0; home_team <= div_teams.length-1; home_team++) {
			let p1_home_team = null;
			for (let i=0; i < teams.length; i++) {
				if (div_teams[home_team].id == teams[i].id) { p1_home_team = i }
			}

			const p1_out_teams = teams_concat.slice(p1_home_team+1, p1_home_team+1 + home_matches(teams, p1_home_team));
			const opponents = div_teams_concat.slice(home_team+1, div_teams.length);
	
			for (const opponent of opponents) {
				var team_b = null;
				var team_a = null;
				if (p1_out_teams.includes(opponent)) {
					team_a = opponent;
					team_b = div_teams[home_team];
				} else {
					team_a = div_teams[home_team];
					team_b = opponent;
				}
				loggingAction(`#${++match_id}: ${team_roles[team_a.id].name} - ${team_roles[team_b.id].name}`);
				
				const match = await Match.create({ id: match_id });
				await match.setTeam_a(team_a);
				await match.setTeam_b(team_b);

				await match.destroy();

				// the bot tips randomly
				bot_tip (match_id)
			}
		}
		for (const team of teams) {
			await print_team_matches(team);
		}
	}
	static.phase = 2;
	static.save();
}

function home_matches (teams, home_team) { // Get the number of home matches this team is supposed to have in phase 1
	if (home_team <= (teams.length-1)/2 && home_team % 2 == 1
		|| home_team >= (teams.length-1)/2 && home_team % 2 == 0) {
		return Math.floor((teams.length-1)/2)
	} else {
		return Math.ceil((teams.length-1)/2)
	}
}

async function getName (user_id) {
	const member = await myGuild.members.fetch(user_id);
	return (member.displayName);
}

function isAdmin (interaction) {
	return (interaction.member._roles.includes(admin_role_id));
}

function isTeamCaptain (interaction, role_a_id, role_b_id) {
	return (interaction.member._roles.includes(admin_role_id)
			|| ( interaction.member._roles.includes(captain_role_id) && (interaction.member._roles.includes(role_a_id) || role_a_id == 'dummy') )
			|| ( interaction.member._roles.includes(captain_role_id) && (interaction.member._roles.includes(role_b_id) || role_a_id == 'dummy') )
	)
}

function loggingAction (action_text) {
	let now = new Date(Date.now());
	fs.appendFileSync('myLog.txt', `\n${now.toUTCString()}: ${action_text}`);
	console.log(action_text)
	return
}

async function loggingError (location_text, action_text, error) {
	let now = new Date(Date.now());
	const error_text = 
	`\n${now.toUTCString()}: ERROR in ${location_text}:`+
	`\n${action_text}`+
	`\n\n${error}\n\n`;
	console.error(error);
	fs.appendFileSync('myLog.txt',error_text);
	await janitor_channel.send(codeBlock(error_text));
	return
}

async function postTips (match) {
	var response1 = `[Match #${indent(match.id, 3, '0')}]  <@&${match.team_a.role_id}>  -  <@&${match.team_b.role_id}> has been closed for tips.`;
	var response2 = '';
	if((await match.countTips()) < 2) {
		response1 = response1.concat(`\n**No one tipped on this match! Had I known this, I would not have worked on this bot. >:(**`);
	}
	for (var i = 4; i >= 0; i--) {
		const tips = await match.getTips({ where: {score_a: i} });
		response2 = response2.concat(`\n(${i}-${4-i}) - ${tips.length} -  `);

		for (const tip of tips) {
			response2 = response2.concat(`${await getName(tip.tipper_id)}, `);
		}
		response2 = response2.slice(0,-2);
	}
	await tipping_channel.send({content: `${response1}\n${codeBlock(response2)}`, allowedMentions: {parse: []}});
	return
}

async function advance_phase () {
	if ( await Match.count({paranoid: false}) == await Match.count({ where: {[Op.or]: [{result_a: {[Op.not]: null}}, {is_cancelled: true}]} , paranoid: false }) ) {

		if (static.phase == 1) {
			static.phase = 2; static.save();
			updates_channel.send({
				content: 'All Phase 1 matches have been played.Please\n\n**add the teams\' divisions to the config file**\n\n**restart the bot**\n\nand press the button below.',
				components: [button_phase_2]
			})
		}
		else {
			updates_channel.send({
				content: 'All matches have been played.\n\nPlease make sure all things are in order and press the button below to finish the event.',
				components: [button_end_event]
			})
		}
	}
	return
}

async function request_result (match) {
	try {
		const res = await fetch('https://speedball.the-dmark.com/stats/list/results.php?&event='+`${event_type}`+'&number='+`${event_number}`+'&match='+`${match.id}`+'&api=json');
		if (res.ok) {
			const object = await res.json();
	
			
			var i = 0;
			var result_a = 0;
			var log_text = `Received [Match #${indent(match.id, 3, '0')}] results:`;
	
			for (const map in object.data) {
				i++;
				if(object.data[map].winner_team_id == match.team_a.id) {result_a++;}; 
				log_text = log_text.concat(`\nmap #${i}  -  winner: ${team_roles[object.data[map].winner_team_id]?.name}, loser: ${team_roles[object.data[map].looser_team_id]?.name}`)
			}
			if (i != 4) {
				await loggingAction(`[Match #${indent(match.id, 3, '0')}] - only ${i} matches have been played.`);
				return false
			}
			
			await loggingAction(log_text);
			return result_a;
		}
		else {return false}
	} catch (error) {
		await loggingError('function request_result', '', error);
	}
}

async function submit_result (match, result_a) {
	loggingAction(`Submitting result: ${team_roles[match.team_a.id].name} ${result_a} - ${4-result_a} ${team_roles[match.team_b.id].name}`);

	match.result_a = result_a;

	// updates
	let now = new Date(Date.now());
	match.history = (`\n${now.toLocaleString("en-GB", date_options_short)}: Result was received: ${result_a} - ${4-result_a}`).concat(match.history);

	var message = `[Match #${indent(match.id, 3, '0')}] <@&${match.team_a.role_id}> ${result_a} - ${4-result_a} <@&${match.team_b.role_id}>`;

	await announcement_channel.messages.edit(match.announcement_id, { content: message+match.history, allowedMentions: {roles: [match.team_a.role_id, match.team_b.role_id]} })

	if (match.tipping_id) {
		tipping_channel.messages.edit( match.tipping_id, { components: [buttons_tipped_green_closed(match.result_a)] } );
	}
	let update = await updates_channel.send({
		content: message+`https://discord.com/channels/${guildId}/${announcement_channel_id}/${match.announcement_id}`
					+`\nMatch ended: ${result_a} - ${4-result_a}`,
		allowedMentions: {parse: []}
	})
	if (match.latest_update_id) {
		await updates_channel.messages.delete(match.latest_update_id);
	}
	match.latest_update_id = update.id;
	match.save(); match.destroy();

	// edit teams' matches messages
	await print_team_matches(match.team_a);
	await print_team_matches(match.team_b);

	// for short notice matches, not much more needs to be done
	if(match.is_short_notice) { 
		await Tip.destroy({ where: { match_id: match.id }, force: true });
		advance_phase();
		return
	}
	

//#region post Points and DMs
	const tips = await match.getTips();
	if (tips.length == 0) {
		await tipping_channel.send({content: `Here is the result of [Match #${indent(match.id, 3, '0')}] <@&${match.team_a.role_id}>  ${match.result_a} - ${4-match.result_a}  <@&${match.team_b.role_id}>\nNo one made a tip on this match. C'mon guys!`, allowedMentions: {parse: []} });
	} else {
		let result_diff = 2*match.result_a - 4;
		let threeP = new Array();
		let oneP = new Array();
		let zeroP = new Array();

		for (const tip of tips) {

			const tipper = await tip.getTipper();

			if (tip.dm_id != null) {
				const user = await client.users.cache.get(tipper.id);
				await user.dmChannel.messages.edit(tip.dm_id, { components: [buttons_dm_result(tip.score_a, match.result_a)] })
			}

			if (!tip.score_a) {
				tip.destroy({ force: true });
			} else {
				const tip_diff = 2*tip.score_a - 4;
				
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

				tipper.save();
				await tip.destroy();
			}

		}

		let reply = `📊  **Here is the result of [Match #${indent(match.id, 3, '0')}] <@&${match.team_a.role_id}>  ${match.result_a} - ${4-match.result_a}  <@&${match.team_b.role_id}>**\n`;
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
	reply = 'Here\'s the current SBL#7 SpeedTips scoreboard:\npts (tips)';
	for (const tipper of tippers) {
		const total_tips = await tipper.countTips({ include: [{model: Match, paranoid: false}], paranoid: false, where: {score_a: {[Op.not]: null}, '$Match.result_a$': { [Op.not]: null } } });
		reply = reply.concat(`\n${indent(tipper.points, 3, ' ')} (${indent(total_tips, 2, ' ')}) - ${await getName(tipper.id)}`);
	}
	await tipping_channel.messages.edit(static.scoreboard_id, codeBlock(reply));


//#region edit stats
	reply = 'tipping statistics   (total/3pts/1pt)\n  total   -    4-0     -    3-1     -    2-2  -                        (usage: tips - ann - dm - channel)\n';
	var i = 0;

	for (const tipper of tippers) {
		i++;
		const tips = await tipper.getTips({ include: [{model: Match, paranoid: false}], paranoid: false, where: {score_a: {[Op.not]: null}, '$Match.result_a$': { [Op.not]: null } } });
		
		var total = 0; 			var total_3p = 0; 	var total_1p = 0;
		var tip4_total = 0; 	var tip4_3p = 0; 	var tip4_1p = 0;
		var tip3_total = 0; 	var tip3_3p = 0; 	var tip3_1p = 0;
		var tipdraw_total = 0;	var tipdraw_3p = 0; var tipdraw_1p = 0;

		for (const tip of tips) {

			var result_diff = 2*tip.match.result_a - 4;
			var tip_diff = 2*tip.score_a - 4;

			pts3 = 0;
			pts1 = 0;

			if (result_diff == tip_diff) {
				pts3 = 1; total_3p++;
			} else if (Math.sign(result_diff) == Math.sign(tip_diff)) {
				pts1 = 1; total_1p++;
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
		
		reply = reply.concat(`\n${indent(total, 2, ' ')}/${indent(total_3p, 2, ' ')}/${indent(total_1p, 2, ' ')}`
							+ `  -  ${indent(tip4_total, 2, ' ')}/${indent(tip4_3p, 2, ' ')}/${indent(tip4_1p, 2, ' ')}`
							+ `  -  ${indent(tip3_total, 2, ' ')}/${indent(tip3_3p, 2, ' ')}/${indent(tip3_1p, 2, ' ')}`
							+ `  -  ${indent(tipdraw_total, 2, ' ')}/${indent(tipdraw_3p, 2, ' ')}`
							+ `  -  ${i}) ${indent(await getName(tipper.id), 15, ' ', true)}`
							+ `  -  (${indent(tipper.dm_setting_tips, 5, ' ')} - ${indent(tipper.dm_setting_ann, 5, ' ')} - ${indent(tipper.dm_tips, 3, ' ')} - ${indent(tipper.channel_tips, 3, ' ')})`);
	}
	await tipping_channel.messages.edit(static.stats_id, codeBlock(reply));
//#endregion edit stats


	advance_phase();

	return
}

async function sendDate (match) {

	let time = null;
	if (match.is_cancelled) {
		time = 'cancelled';
	} else if (match.time == null) {
		time = null;
	} else {
		time = match.time.toISOString().replace(/T/, ' ').replace(/\..+/, '')
	}
	
	const res = await fetch('https://speedball.the-dmark.com/stats/post/match-data.php',{
		method: 'POST',
		body: JSON.stringify({
			event_type: event_type,
			event_number: event_number,
			match_id: match.id,
			match_time: time,
			team_a_id: match.team_a.id,
			team_b_id: match.team_b.id
		}),
		headers: { 
			'content-type': 'application/json; charset=UTF-8',
			'accept': '*/*',
			'user-agent':'*'
		},
	})
	if(res.ok){
		//const data = await res.json();
		return loggingAction(`[Match #${indent(match.id, 3, '0')}] result has been sent to website.`)
	}
	else return loggingError(`[Match #${indent(match.id, 3, '0')}] result could not be sent to website.`,'','')
}

async function updateDM (interaction, tipper) {
	loggingAction(`${interaction.user.username} changed their DM settings: tips (${tipper.dm_setting_tips}) - announcements (${tipper.dm_setting_ann})`);
	await interaction.update({ components: [(tipper.dm_setting_ann ? button_dm_setting_ann : (tipper.dm_setting_tips ? button_dm_setting_tips : button_dm_none) )] })
	return
}

async function print_team_matches (team) {
	reply = `<@&${team.role_id}>\n${await team_roles[team.id].members.map(m=>m.displayName).join(', ')}\n`;

	const matches = await team.getMatches({ paranoid: false, include: ['team_a','team_b'] });
	for (const match of matches) {
		let new_line = `\n[#${indent(match.id, 3, '0')}] ${match.time ? match.time.toLocaleString("en-GB", date_options_very_short) : '--/--'} <@&${match.team_a.role_id}>  ${match.result_a != null ? `${match.result_a} - ${4-match.result_a}` : '\\_ - \\_'}  <@&${match.team_b.role_id}> https://discord.com/channels/${guildId}/${announcement_channel_id}/${match.announcement_id}`;
		if (match.is_cancelled) {new_line = strikethrough(new_line)}

		reply = reply.concat(new_line);
	}
	await announcement_channel.messages.edit(team.matches_message_id, {content: reply, allowedMentions: {roles: [team.role_id]} });
}

function indent (string, new_length, indent_symbol, add_to_back) {
	while (`${string}`.length < new_length) {
		if (add_to_back) {
			string = `${string}`.concat(indent_symbol);
		} else {
			string = indent_symbol.concat(`${string}`);
		}
	}
	return string;
}

async function bot_tip (match_id) {
	const tip = await Tip.create({
		tipper_id:	client.user.id,
		match_id:	match_id,
		score_a:	Math.floor(5*Math.random())
	})
	tip.destroy();
}

const date_options = {timeZone: "Europe/Berlin", weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' };
const date_options_short = {timeZone: "Europe/Berlin", weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'};
const date_options_very_short = {timeZone: "Europe/Berlin", day: '2-digit', month: '2-digit'};

module.exports = { closeMatch, isTeamCaptain, isAdmin, loggingAction, loggingError, createTip, getName, print_team_matches, submit_result, indent, announce_match, cancel_match, reschedule_match, postpone_match, date_options, date_options_short, date_options_very_short };

//#endregion FUNCTIONS

//#region STARTUP

client.once('ready', async () => {
	try {
		loggingAction(`Logged in as ${client.user.tag}!`);

		janitor_channel = await (await client.guilds.fetch(janitor_guild_id)).channels.fetch(janitor_channel_id);

		myGuild =  client.guilds.cache.get(guildId);
		tipping_channel = await myGuild.channels.fetch(tipping_channel_id);
		announcement_channel = await myGuild.channels.fetch(announcement_channel_id);
		updates_channel = await myGuild.channels.fetch(updates_channel_id);
		for (const team of teams_config) {
			team_roles[team.id] = await myGuild.roles.cache.get(team.role_id);
		}

		// caching members (otherwise looking up role-members can miss some)
		await myGuild.members.fetch();

		// creating DMs with all known users, so I can access them any time
		const tippers = await Tipper.findAll({where: {id: {[Op.not]: client.user.id} }});
		for (const tipper of tippers) {
			(await client.users.fetch(tipper.id)).createDM();
		}

		// /deploycommands is also an admin-/command, so I'm doing it that way
		const fakeInteraction = {member: await myGuild.members.fetch(client.user.id)};
		await client.commands.get('deploycommands').execute(fakeInteraction);

		// if the databank is empty, we fill the static object and send first messages
		static = await Static.findOne();
		if (!static) { 
			await updates_channel.send({
				content: 'The bot is ready. Please make sure the config is set up correctly and then press the button below.',
				components: [button_initialise]
			})
			}
		else { // if database is already existent, fetch important static objects
			registration_message = await tipping_channel.messages.fetch(static.registration_id)
			captain_message = await announcement_channel.messages.fetch(static.captain_id)
		}
	} catch (error) {
		await loggingError('#region STARTUP', '', error);
	}
});
//#endregion STARTUP

//#region INTERVALL

setInterval( async function() {
	try {
		// close matches
		var matches = await Match.findAll({ where: {is_open: true, time: {[Op.lt]: Date(Date.now())}}, include: ['team_a','team_b'] });
		if(matches){ for (const match of matches) { closeMatch(match); } }

		// look for results
		matches = await Match.findAll({ where: {time: {[Op.lt]: Date(Date.now())+(1*60*60*1000) }}, include: ['team_a','team_b'] });
		if(matches){ 
			for (const match of matches) {
				const result_a = await request_result(match);
				if (result_a != null) {await submit_result(match, result_a)}
			}
		}
	
	} catch (error) {
		await loggingError('#region INTERVALL', '', error);
	}


},  15*1000, tipping_channel);
//}, 5 * 60 * 1000, tipping_channel);

//#endregion INTERVALL

//#region CREATE COMMANDS

loggingAction(`-----------------------------------------Bot has been restarted.-----------------------------------------`);

const path = require('node:path');
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	client.commands.set(command.data.name, command);

	loggingAction(`/${command.data.name} added.`);
}

//#endregion CREATE COMMANDS

//#region EXECUTE COMMANDS

client.on('interactionCreate', async interaction => {
	try {
		if (!interaction.isCommand()) return;
		loggingAction(`${interaction.user.tag} used /${interaction.commandName}`);
		
		if (interaction.channel != tipping_channel && interaction.channel != announcement_channel && interaction.channel != updates_channel ) {
			return interaction.reply({ content: `SpeedTipsBot only works in ${tipping_channel.url}, ${announcement_channel.url} and ${updates_channel.url}`, ephemeral: true });
		}
		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		await interaction.reply({ content: `The bot is working on your command /${interaction.commandName}`, loading: true, ephemeral: true })
		await command.execute(interaction, client, myGuild, tipping_channel, announcement_channel);
	} catch (error) {
		await loggingError('#region EXECUTE COMMANDS', '', error);
		return interaction.editReply({ content: `There was an error while executing this command!\nThe error has been submitted.`, components: [], ephemeral: true  });
	}
});

//#endregion EXECUTE COMMANDS

//#region BUTTON FUNCTIONS

async function b_dm_setting (interaction) {
	loggingAction(`${interaction.user.tag} pressed ${interaction.customId}`);

	const tipper = await Tipper.findOne({ where: {id: interaction.user.id} });

	if (tipper.dm_setting_ann) {
		tipper.dm_setting_ann = false;
	} else if (tipper.dm_setting_tips) {
		tipper.dm_setting_tips = false;
	} else {
		tipper.dm_setting_ann = true;
		tipper.dm_setting_tips = true;
	}
	tipper.save();
	updateDM(interaction, tipper);
	return
}

async function b_register_tipping_account (interaction) {

	loggingAction(`${interaction.user.tag} pressed ${interaction.customId}`);

	var tipper = await Tipper.findOne({ where: {id: interaction.user.id} });
	if (tipper) { return interaction.update({}); }
	tipper = await Tipper.create( {id: interaction.user.id} );
	
	tipping_channel.members.add(interaction.user.id);

	// send initial dm
	dm_channel = await interaction.user.createDM();
	const dm = await dm_channel.send({ 
		content: 
		'Hello, I am SpeedTipsBot!'+
		'\nI will send you your tips and new match announcements.'+
		'\nThat is the most convenient way for you to stay updated, have an overview of your tips as well as a permanent record.'+
		'\n\nYou can turn these features off below.\nYou can also mute me (richtclick me in DMs), if you want to keep recieving the messages but not get pinged.'+
		'\n\nI have pinned this message so you can find it easily in the future.',
		components: [button_dm_setting_ann]
	});
	dm.pin();
	tipper.dm_id = dm.id; tipper.save();
	

	// send all currently open matches as dms
	const matches = await Match.findAll({ where: {is_open: true}, include: ['team_a','team_b'] });
	for (const match of matches) {
		createTip(interaction, tipper, match);
	}
	return interaction.update({});
}

async function b_phase_2 (interaction) {
	loggingAction(`${interaction.user.tag} pressed ${interaction.customId}`);
	if(!isAdmin(interaction)) { return interaction.editReply({ content: `Only admins can start phase 2.`}) }

	generate_phase_2();

	await interaction.message.edit({ content: 'PHASE 2 HAS BEGUN', components: [] })
}

async function b_end_event (interaction) {
	loggingAction(`${interaction.user.tag} pressed ${interaction.customId}`);
	if(!isAdmin(interaction)) { return interaction.editReply({ content: `Only admins can start phase 2.`}) }

	// do things
}

async function b_initialise (interaction) {
	await interaction.message.delete();

	static = await Static.create();

	registration_message = await tipping_channel.send({
		content: 
		`Welcome to SpeedTips for ${event_name}!`+
		'\nTo add some more fun to the league, here you can leave bets on league matches. All you can win is points and all you can lose are some hairs.'+
		'\n\nWhen I am less lazy I will add some explanations in this paragraph.'+
		'\nClick the button below to enter the game. The Bot will send you a DM confirming your registration.',
		components: [button_register]
	})
	captain_message = await announcement_channel.send({
		content:
		`Hello Captains!\nWelcome to ${event_name}`+
		'\n\nIn this channel you will be using the bot to announce your scheduled matches.'+
		`\nUse the ${inlineCode('/schedulematch')} command and fill in the details.`+
		'\n\nTo re-schedule a match, just submit the match again.'+
		'\nTo postpone a match, submit 0 for the day, month, hour, and minute.'
	})
	scoreboard_message = await tipping_channel.send({
		content: 'SCOREBOARD\n\nThis will appear once a match has been played.'
	})
	stats_message = await tipping_channel.send({
		content: 'STATS\n\nThis will appear once a match has been played.'
	})

	// teams
	const messages = [];
	teams_config.sort((a, b) => a.id - b.id);

	for (let i=0; i<teams_config.length; i++) {
		const matches_message = await announcement_channel.send({ content: `<@&${teams_config[i].role_id}>`, allowedMentions: {parse: []} });
		matches_message.suppressEmbeds(true);
		messages.push(matches_message);

		await Team.create({
			id: 				teams_config[i].id,
			role_id:			teams_config[i].role_id,
			matches_message_id:	matches_message.id
		});
	}

	//while (messages.length > 0) { await messages.pop().pin(); }
	//await scoreboard_message.pin(); await captain_message.pin();

	static.id = 1;
	static.registration_id = 	registration_message.id;
	static.captain_id = 		captain_message.id;
	static.scoreboard_id = 		scoreboard_message.id;
	static.stats_id = 			stats_message.id;
	static.phase =				(has_divisions ? 1 : 0)
	static.save();

	// tipperBot
	await Tipper.create({
		id: 		client.user.id,
		is_admin: 	true,
		dm_setting_tips:	false,
		dm_setting_ann:		false,
	});

	// matches
	await generate_first_leg();
	if (static.phase == 0) {await generate_second_leg(); }
	
	const matches = await Match.findAll({ paranoid: false, include: ['team_a','team_b'] });
	for (const match of matches) {
		const announcement = await announcement_channel.send(`[#${indent(match.id, 3, '0')}]`);
		announcement.edit({
			content: `[#${indent(match.id, 3, '0')}] <@&${match.team_a.role_id}> - <@&${match.team_b.role_id}>`,
			allowedMentions: {roles: [match.team_a.role_id, match.team_b.role_id]}
			});
		match.announcement_id = announcement.id; match.save()
	}

	const teams = await Team.findAll();
	for (const team of teams) {
		await print_team_matches(team);
	}

}

//#endregion BUTTON FUNCTIONS

//#region EXECUTE BUTTONS

client.on('interactionCreate', async interaction => {
	try{
		if (!interaction.isButton()) return;

		// only "tippable messages" are "regExable"
		const regExpArgs = interaction.message.content.match(new RegExp(/^'\[Match #(\d+)\](?:[\s\S]*)$/, 'i'));
	
		// button is a tip (i.e. from a "tippable" message)
		if (regExpArgs != null) {
			const tipper = await Tipper.findOne({where: {id: interaction.user.id }})

			if(!tipper) {
				loggingAction(`${interaction.user.tag} tried to tip on [Match #${indent(regExpArgs[1], 3, '0')}], but wasn't registered.`);

				return interaction.reply({ content: `To place a tip, you need to be registered: ${registration_message.url}`, ephemeral: true, allowedMentions: {parse: []} });
			}
		
			loggingAction(`${interaction.user.tag} tipped "${interaction.customId}" on Match #${indent(regExpArgs[1], 3, '0')} in ${(interaction.channel.isDMBased() ? 'dm_channel' : 'tipping_channel')}`);

			const match = await Match.findOne({ where: {id: regExpArgs[1]}, include: ['team_a','team_b'] })
			await createTip(interaction, tipper, match);
			interaction.update({});
			return 
		}

		// any other public button
		switch (interaction.customId) {
			case 'b_dm_setting': 				b_dm_setting(interaction); return;
			case 'b_register_tipping_account': 	b_register_tipping_account(interaction); return;
			case 'b_initialise': 				b_initialise(interaction); return;
			case 'b_phase_2': 					b_phase_2(interaction); return;
			case 'b_end_event': 				b_end_event(interaction); return;
		}
		return

	} catch (error) {
		await loggingError('#region EXECUTE BUTTONS', `${interaction.user.tag} pressed ${interaction.customId}`, error);
		return interaction.reply({ content: `There was an error while executing this command!\nThe error has been submitted.`, components: [], ephemeral: true });
	}
});

//#endregion EXECUTE BUTTONS

client.login(token);