const { Client, Collection, GatewayIntentBits, ComponentType, codeBlock, strikethrough, inlineCode }  = require('discord.js');
const { Op } = require("sequelize");
const fs = require('node:fs');
const { token, guildId, ernsteen_id, announcement_channel_id, tipping_channel_id, adminRole_id, captainRole_id, tournament_name  } = require('./config.json');
const { Tip, Tipper, Match, Static } = require('./dbObjects.js');
const { buttons_tip, buttons_tip_closed, buttons_tipped, button_closed, button_dm_tips_yes, button_dm_ann_yes, button_dm_tips_no, button_dm_ann_no, button_register, buttons_warning, button_cancelled, buttons_tipped_closed } = require('./buttons-presets.js');

// global variables
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
var myGuild = null;
var tipping_channel = null;
var announcement_channel = null;
var registration_message = null;
var captain_message = null;
var scoreboard_message = null;
var stats_message = null;
var adminRole = null;
var captainRole = null;
var static = null;
var now = null;


//#region HELPER FUNCTIONS

async function closeMatch (client, match, tipping_channel) {
	match.is_open = false;
	match.save();

	tipping_channel.messages.edit( match.tipping_id, { components: [button_closed, buttons_tip_closed]} );

	const tips = await Tip.findAll( { where: {match_id: match.id} } )
	for (const tip of tips) {
		if (tip.dm_id) {
			const user = await client.users.cache.get(tip.tipper_id);
			const dm_channel = await user.createDM();
			dm_channel.messages.edit(tip.dm_id, { components: [buttons_tipped_closed(tip.score_a)] })
		}
	}

	if(!match.is_short_notice) {postTips(match);}
	return
}

async function createTip (interaction, match_id) {
	try {
		const tipper = await Tipper.findOne({ where: {id: interaction.user.id}});

		// tip back-end
		var tip = await Tip.findOne({ where: { tipper_id: tipper.id, match_id: match_id }, paranoid: false });
		if (!tip) {
			tip = await Tip.create({ tipper_id: tipper.id, match_id: match_id });
		} else { tip.restore();}

		if (['0','1','2','3','4'].includes(interaction.customId)) {
			tip.score_a = interaction.customId;
			await tip.save();
		}


		// tip front-end
		
		//find or send the tip dm
		var dm = null;
		await interaction.user.createDM();
		if (tip.dm_id == null && !tipper.dm_tips) {
			return
		} 
		else if (tip.dm_id == null && tipper.dm_tips) {
			dm = await interaction.user.dmChannel.send({  //serves as a placeholder message but becomes true if not replaced, probably
				content: `If you see this, something has gone wrong with your Tip generation for Match #${match_id}. Whoops...`
			});
			tip.dm_id = dm.id; tip.save();
		} else {
			dm = await interaction.user.dmChannel.messages.fetch(tip.dm_id);
		}

		// edit the tip dm
		const match = await Match.findOne({where: {id: match_id}});
		const role_a = await myGuild.roles.cache.get(match.team_a_id);
		const role_b = await myGuild.roles.cache.get(match.team_b_id);
		await dm.edit({
			content: `'[Match #${match.id}]  ${role_a.name} - ${role_b.name}\n${await role_a.members.map(m=>m.displayName).join(', ')} - ${await role_b.members.map(m=>m.displayName).join(', ')}\n${match.time.toLocaleString("en-GB", date_options)}`,
			components: [(match.is_open ? (tip.score_a == null ? buttons_tip : buttons_tipped(interaction.customId)) : buttons_tip_closed)] //this takes into account if the match is posted as closed, but this is prevented in /announcematch
		})
	} catch (error) {
		await loggingError('createTip()', `${interaction.user.tag} tipped "${interaction.customId}" on Match #${match_id} in ${(interaction.channel.isDMBased() ? 'dm_channel' : 'tipping_channel')}`, error);
		return interaction.reply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [], ephemeral: true  });
	}
}

async function getName(user_id) {
	const member = await myGuild.members.fetch(user_id);
	return (member.displayName);
}

function isAdmin (interaction) {
	return (interaction.member._roles.includes(adminRole.id));
}

function isTeamCaptain (interaction, role_a, role_b) {
	return (interaction.member._roles.includes(adminRole.id)
			|| ( interaction.member._roles.includes(captainRole.id) && (interaction.member._roles.includes(role_a.id) || role_a == 'dummy') )
			|| ( interaction.member._roles.includes(captainRole.id) && (interaction.member._roles.includes(role_b.id) || role_a == 'dummy') )	
	)
}

function loggingAction (action_text) {
	now = new Date(Date.now());
	fs.appendFileSync('myLog.txt', `\n${now.toUTCString()}: ${action_text}`);
	console.log(action_text)
	return
}

async function loggingError (location_text, action_text, error) {
	now = new Date(Date.now());
	const error_text = 
	`\n${now.toUTCString()}: ERROR in ${location_text}:`+
	`\n${action_text}`+
	`\n\n${error}\n\n`;
	console.error(error);
	fs.appendFileSync('myLog.txt',error_text);
	await client.users.cache.get(ernsteen_id).send(codeBlock(error_text));
	return
}

async function postTips (match) {
	var response1 = `[Match #${match.id}]  <@&${match.team_a_id}>  -  <@&${match.team_b_id}> has been closed for tips.`;
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

async function requestResult(match_id) {
	const res = await fetch('https://speedball.the-dmark.com/stats/list/results.php?&event=funcup&number=239&match=8&api=json');
	if (res.ok) {
		const object = await res.json();
		
		var i = 0;
		var score_red = 0;
		for (const match in object.data) {
			i++;
			if(object.data[match].map_winner = 'red') {score_red++;};
		}
	}
}

async function updateDM (tipper, interaction) {
	loggingAction(`${interaction.user.username} changed their DM settings: tips (${tipper.dm_tips}) - announcements (${tipper.dm_ann})`);
	await interaction.update({ components: [(tipper.dm_tips ? button_dm_tips_yes : button_dm_tips_no), (tipper.dm_ann ? button_dm_ann_yes : button_dm_ann_no)] })
	return
}

const date_options = {timeZone: "Europe/Berlin", weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' };
const date_options_short = {timeZone: "Europe/Berlin", weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'};
const date_options_very_short = {timeZone: "Europe/Berlin", day: '2-digit', month: '2-digit', year: '2-digit'};

module.exports = { closeMatch, isTeamCaptain, isAdmin, loggingAction, loggingError, createTip, getName, date_options, date_options_short, date_options_very_short };

//#endregion HELPER FUNCTIONS

//#region STARTUP

client.once('ready', async () => {
	try {
		loggingAction(`Logged in as ${client.user.tag}!\n------------------------------------------------------------------------------------------------------------`);


		myGuild =  client.guilds.cache.get(guildId);
		tipping_channel = myGuild.channels.cache.get(tipping_channel_id);
		announcement_channel = myGuild.channels.cache.get(announcement_channel_id);
		adminRole = myGuild.roles.cache.get(adminRole_id);
		captainRole = myGuild.roles.cache.get(captainRole_id);

		// /deploycommands is also an admin-/command, so I'm doing it that way
		const fakeInteraction = {member: await myGuild.members.fetch(client.user.id)};
		await client.commands.get('deploycommands').execute(fakeInteraction);

		// if the databank is empty, we fill the statics and send first messages
		static = await Static.findOne();
		if (!static) {
			registration_message = await tipping_channel.send({
				content: 
				`Welcome to SpeedTips for ${tournament_name}!`+
				'\nTo add some more fun to the league, here you can leave bets on league matches. All you can win is points and all you can lose are some hairs.'+
				'\n\nWhen I am less lazy I will add some explanations in this paragraph.'+
				'\nClick the button below to enter the game. The Bot will send you a DM confirming your registration.',
				components: [button_register]
			})
			captain_message = await announcement_channel.send({
				content:
				`Hello Captains!\nWelcome to ${tournament_name}`+
				'\n\nIn this channel you will be using the bot to announce your scheduled matches.'+
				`\nUse the ${inlineCode('/schedulematch')} command and fill in the details.`+
				'\n\nTo re-schedule a match just submit the match again. (The \'reschedule\' button will give you a prefilled promt, that you can copy-paste.)'+
				'\nTo cancel a match click the button on the match\'s announcement.'+
				`\n\nIf you care to, you can also submit your match results with the ${inlineCode('/submitresult')} command. The tipping game enthusiasts would be appreciative.`
			})
			scoreboard_message = await tipping_channel.send({
				content: 'SCOREBOARD\n\nThis will appear once a match has been played.'
			})
			stats_message = await tipping_channel.send({
				content: 'STATS\n\nThis will appear once a match has been played.'
			})
			allmatches1_channel = await announcement_channel.send({
				content: 'Matches #1-50 go here.', allowedMentions: {parse: []}
			})
			allmatches2_channel = await announcement_channel.send({
				content: 'Matches #51-100 go here.', allowedMentions: {parse: []}
			})
			allmatches3_channel = await announcement_channel.send({
				content: 'Matches #101-150 go here.', allowedMentions: {parse: []}
			})
			allmatches4_channel = await announcement_channel.send({
				content: 'Matches #151-200 go here.', allowedMentions: {parse: []}
			})
			
			//scoreboard_message.pin(); captains_message.pin(); allmatches1_channel.pin();

			static = await Static.create();
			static.id = 1;
			static.registration_id = 	registration_message.id;
			static.captain_id = 		captain_message.id;
			static.scoreboard_id = 		scoreboard_message.id;
			static.stats_id = 			stats_message.id;
			static.allmatches1_id = 	allmatches1_channel.id;
			static.allmatches2_id = 	allmatches2_channel.id;
			static.allmatches3_id = 	allmatches3_channel.id;
			static.allmatches4_id = 	allmatches4_channel.id;
			static.save();

			// tipperBot
			await Tipper.create({
				id: 		client.user.id,
				is_admin: 	true,
				dm_tips:	false,
				dm_ann:		false,
			});
		}
		else { // if database is already existent, fetch important static objects
			registration_message = await tipping_channel.messages.fetch(static.registration_id)
			captain_message = await announcement_channel.messages.fetch(static.captain_id)
		}
	} catch (error) {
		await loggingError('#region STARTUP', '', error);
		await client.users.cache.get(ernsteen_id).send(codeBlock(error_text));
	}
});
//#endregion STARTUP

//#region INTERVALL

setInterval( async function() {
	try {
		// close matches
		var matches = await Match.findAll({where: {is_open: true, time: {[Op.lt]: Date(Date.now())} }});
		if(!matches){return}

		for (const match of matches) {
			closeMatch(client, match, tipping_channel);
		}

		// look for results
		matches = await Match.findAll({where: {time: {[Op.lt]: Date(Date.now())+(1*60*60*1000) } }});
		if(!matches){return}

		for (const match of matches) {
			// look for results
			// submit result
		}
	} catch (error) {
		await loggingError('#region INTERVALL', '', error);
		await client.users.cache.get(ernsteen_id).send(codeBlock(error_text));
	}


}, 3000, tipping_channel);
//}, 5 * 60 * 1000, tipping_channel);

//#endregion INTERVALL

//#region CREATE COMMANDS


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
		
		if (interaction.channel != tipping_channel && interaction.channel != announcement_channel) {
			return interaction.reply({ content: `SpeedTipsBot only works in ${tipping_channel.url} and ${announcement_channel.url}`, ephemeral: true });
		}
		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		await interaction.reply({ content: `The bot is working on your command /${interaction.commandName}`, loading: true, ephemeral: true })
		await command.execute(interaction, client, myGuild, tipping_channel, announcement_channel);
	} catch (error) {
		await loggingError('#region EXECUTE COMMANDS', '', error);
		return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [], ephemeral: true  });
	}
});

//#endregion EXECUTE COMMANDS

//#region BUTTON FUNCTIONS

async function b_cancel_match (interaction) {
	try {
		const match = await Match.findOne({ where: { announcement_id: interaction.message.id }});

		loggingAction(`${interaction.user.tag} pressed ${interaction.customId} [Match #${match.id}]`);

		await interaction.reply({ content: `The bot is working on your button press.`, loading: true, ephemeral: true })
		if (!isTeamCaptain(interaction, 'dummy', 'dummy')) { return interaction.editReply({ content: `Only captains can cancel their own matches.`}) }

		const role_a = await myGuild.roles.cache.get(match.team_a_id);
		const role_b = await myGuild.roles.cache.get(match.team_b_id);
		if (!isTeamCaptain(interaction, role_a, role_b)) { return interaction.editReply({ content: `Your can cancel your own matches.`}) }
		
		// send warning
		const a = await interaction.editReply({ 
			content: 
			`Are you sure you wish to cancel [Match #${match.id}]?\n<@&${match.team_a_id}>  -  <@&${match.team_b_id}>  -  ${match.time.toLocaleString("en-GB", date_options)}`+
			'\n\nIf this is wrong, people might get pissed.',
			components: [buttons_warning] 
		})

		const filter = i => { return true };
		const collectedButton = await a?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: ComponentType.Button})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedButton.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user pressed a button (confirm/nevermind)
		loggingAction(`${interaction.user.tag} pressed ${interaction.customId} and ${collectedButton.customId}`);

		if(collectedButton.customId == 'b_nevermind') {
			interaction.editReply({ content: 'Good choice.', components: [] })
			return
		}


		const message = `[Match #${match.id}]  ${role_a.name} - ${role_b.name}`;
	
		// delete tips
		const tips = await match.getTips();
		for (const tip of tips) {
			const dm_channel = await interaction.user.createDM();
			if (tip.dm_id) {
				await dm_channel.messages.edit(tip.dm_id, { contents: message, components: [button_cancelled] });
			}
			tip.dm_id = null; tip.save(); tip.destroy();
		}

		// edit announcement and tipping
		const announcement = await announcement_channel.messages.fetch(match.announcement_id)
		announcement.edit({content: `${strikethrough(announcement.content)}\n\nThe Match has been cancelled`, components: [button_cancelled] });
		announcement.reply(`This match has been cancelled`);

		tipping_channel.messages.edit(match.tipping_id, { contents: message, components: [button_cancelled] });

		// delete match
		match.time = null; match.announcement_id = null; match.tipping_id = null; match.destroy(); match.save();

		interaction.editReply({ content: `Successfully cancelled Match.`, components: [] });
		return
	} catch (error) {
		await loggingError('b_cancel_match', `${interaction.user.tag} pressed ${interaction.customId}${typeof collectedButton !== 'undefined' ? ` and ${collectedButton.customId}` : '' }`, error);
		return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
	}
}

async function b_dm_ann (interaction) {
	loggingAction(`${interaction.user.tag} pressed ${interaction.customId}`);

	const tipper = await Tipper.findOne({ where: {id: interaction.user.id} });

	tipper.dm_ann = !tipper.dm_ann;
	if (tipper.dm_ann) {tipper.dm_tips = true;}
	tipper.save();
	updateDM(tipper, interaction);
	return
}

async function b_dm_tips (interaction) {
	loggingAction(`${interaction.user.tag} pressed ${interaction.customId}`);

	const tipper = await Tipper.findOne({ where: {id: interaction.user.id} });

	tipper.dm_tips = !tipper.dm_tips;
	if (!tipper.dm_tips) {tipper.dm_ann = false;}
	tipper.save();
	updateDM(tipper, interaction);
	return
}

async function b_register_tipping_account (interaction) {
	loggingAction(`${interaction.user.tag} pressed ${interaction.customId}`);

	var tipper = await Tipper.findOne({ where: {id: interaction.user.id} });
	if (tipper) { return interaction.update({}); }
	tipper = await Tipper.create( {id: interaction.user.id} );

	// send initial dm
	dm_channel = await interaction.user.createDM();
	const dm = await dm_channel.send({ 
		content: 
		'Hello, I am SpeedTipsBot!'+
		'\nI will send you your tips and new match announcements.'+
		'\nThat is the most convenient way for you to stay updated, have an overview of your tips as well as a permanent record.'+
		'\n\nYou can turn these features off below.\nYou can also mute me (richtclick me in DMs), if you want to keep recieving the messages but not get pinged.'+
		'\n\nI have pinned this message so you can find it easily in the future.',
		components: [button_dm_tips_yes, button_dm_ann_yes]
	});
	//dm.pin();
	tipper.dm_id = dm.id; tipper.save();
	

	// send all currently open matches as dms
	const matches = await Match.findAll({where: {is_open: true}});
	for (const match of matches) {
		createTip(interaction, tipper, match);
	}
	return interaction.update({});
}

async function b_reschedule_match (interaction) {
	loggingAction(`${interaction.user.tag} pressed ${interaction.customId}`);

	await interaction.reply({ content: `The bot is working on your button press.`, loading: true, ephemeral: true })
	if (!isTeamCaptain(interaction, 'dummy', 'dummy')) { return interaction.editReply({ content: `Only captains can reschedule matches.`}) }

	const match = await Match.findOne({ where: { announcement_id: interaction.message.id }, paranoid: false});
	const role_a = await myGuild.roles.cache.get(match.team_a_id);
	const role_b = await myGuild.roles.cache.get(match.team_b_id);
	if (!isTeamCaptain(interaction, role_a, role_b)) { return interaction.editReply({ content: `Only captains can reschedule matches.`}) }

	const string = `/schedulematch id:${match.id} team-a:@${role_a.name} team-b:@${role_b.name} hour:${match.time.getHours()} minute:${match.time.getMinutes()} day:${match.time.getDate()} month:${match.time.getMonth()+1} year:${match.time.getFullYear()}`
	interaction.editReply(`Copy+Paste this and change the time:${codeBlock(string)}`);
	return
}

//#endregion BUTTON FUNCTIONS

//#region EXECUTE BUTTONS

client.on('interactionCreate', async interaction => {
	try{
		if (!interaction.isButton()) return;

		// only "tippable messages" are "regExable"
		const regExpArgs = interaction.message.content.match(new RegExp(/^'\[Match #(\d+)\](?:.+)\n(?:.+)\n(?:.+)$/, 'i'));
	
		// button is a tip (i.e. from a "tippable" message)
		if (regExpArgs != null) {

			if(await Tipper.count({where: {id: interaction.user.id }}) == 0) {
				loggingAction(`${interaction.user.tag} tried to tip on [Match #${regExpArgs[1]}], but wasn't registered.`);

				return interaction.reply({ content: `To place a tip, you need to be registered: ${registration_message.url}`, ephemeral: true, allowedMentions: {parse: []} });
			}
		
			loggingAction(`${interaction.user.tag} tipped "${interaction.customId}" on Match #${regExpArgs[1]} in ${(interaction.channel.isDMBased() ? 'dm_channel' : 'tipping_channel')}`);

			await createTip(interaction, regExpArgs[1]);
			interaction.update({});
			return 
		}

		// any other public button
		switch (interaction.customId) {
			case 'b_cancel_match': 				b_cancel_match(interaction); return;
			case 'b_dm_ann': 					b_dm_ann(interaction); return;
			case 'b_dm_tips': 					b_dm_tips(interaction); return;
			case 'b_register_tipping_account': 	b_register_tipping_account(interaction); return;
			case 'b_reschedule_match': 			b_reschedule_match(interaction); return;
			case 'b_i_understand': 				return;	//handled in slash commands
			case 'b_nevermind': 				return;	//handled in slash commands
		}
		return

	} catch (error) {
		await loggingError('#region EXECUTE BUTTONS', `${interaction.user.tag} pressed ${interaction.customId}`, error);
		return interaction.reply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [], ephemeral: true });
	}
});

//#endregion EXECUTE BUTTONS



client.login(token);