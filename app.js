const { Sequelize, Op, Model, DataTypes } = require("sequelize");
const { Client, Formatters, Intents, MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed}  = require('discord.js');
const { ActionRowBuilder } = require("@discordjs/builders");
const { Tipper, Tip, Match, Team, Player } = require('./dbObjects.js');
const { token } = require('./config.json');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

//#region COMMANDS

client.on('interactionCreate', async interaction => {

	if (!interaction.isCommand()) return;
	if (interaction.channel.name != 'speedtips') return interaction.reply({ content: 'SpeedTipsBot only works in #speedtips', ephemeral: true });

	var tipper = await Tipper.findOne({ where: {id: interaction.user.id} });
	if (tipper != null) {tipper.name = interaction.user.username; tipper.save();}

	const filter = i => { return i.message.interaction.id === interaction.id; };

	const { commandName } = interaction;
	console.log(`${interaction.user.tag} triggered /${commandName}`);

	if (commandName === 'help') {

		reply = 
		`/tip: Make a prediction on a match.
/matches: Replies with a list of all ongoing matches and your tips on them.
/scoreboard: Replies with the SpeedTips Scoreboard.
/allmatches: Replies with all matches, including the ended ones.
/seasontip: Make a prediction on the final results of the league.
`
		if(!tipper || (!tipper.is_mod && !tipper.is_admin)) return interaction.reply({ content: Formatters.codeBlock(reply), ephemeral: true });
		reply = reply.concat (`
[mod] /creatematch: Create a new match to tip on.
[mod] /closematch: Stop a match from taking any more bets, or open it for bets again.
[mod] /endmatch: Ends the match and award points to the tippers.
[mod] /deletematch: Delete an ongoing match.
[mod] /relinquishmod: Remove yourself from SpeedTips moderators.
`		)
		if(!tipper.is_admin) return interaction.reply({ content: Formatters.codeBlock(reply), ephemeral: true });
		reply = reply.concat (`
[admin] /endseason: End the season tips and allocate the points.
[admin] /restorematch: Restore an ended match, taking away the awarded points in the process auto-closes it.
[admin] /deletetip: Remove someone\'s tip from a specific match.
[admin] /addpoints: Add/subtract a number of points to a person's score.
[admin] /teams: Replies with a list of all teams and their players.
[admin] /addteam: Add a team.
[admin] /deleteteam: Delete a team along wtih its players.
[admin] /renameteam: Change the name of an existing team.
[admin] /addplayer: Add a player to a team.
[admin] /deleteplayer: Delete a player from a team.
[admin] /addmod: Add/remove someone as SpeedTips moderator.
[admin] /addadmin: Addsomeone as SpeedTips admin.
[admin] /relinquishadmin: Remove yourself from SpeedTips admins.
`		)
		return interaction.reply({ content: Formatters.codeBlock(reply), ephemeral: true });

	} else if (commandName === 'tip') {

		let matches = await Match.findAll({ where: {is_open: true} });
		if(matches.length == 0) {return interaction.reply({ content: 'There are currently no matches to tip on.', ephemeral: true })};

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
		await interaction.reply({ content: reply, components: [new MessageActionRow().addComponents(select)], ephemeral: true });

		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user made a selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);

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
		console.log(`${interaction.user.tag} pressed /${commandName} ${collectedSelect.values[0]} ${collectedButton.customId}`);

		const score_a = parseInt(collectedButton.customId);

		const pushed_buttons = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`4`).setLabel('4 - 0').setDisabled(true).setStyle(`${( score_a == 4 ? 'PRIMARY' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`3`).setLabel('3 - 1').setDisabled(true).setStyle(`${( score_a == 3 ? 'PRIMARY' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`2`).setLabel('2 - 2').setDisabled(true).setStyle(`${( score_a == 2 ? 'PRIMARY' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`1`).setLabel('1 - 3').setDisabled(true).setStyle(`${( score_a == 1 ? 'PRIMARY' : 'SECONDARY' )}`),
			new MessageButton().setCustomId(`0`).setLabel('0 - 4').setDisabled(true).setStyle(`${( score_a == 0 ? 'PRIMARY' : 'SECONDARY' )}`),
		)

		if (!tipper) { tipper = await Tipper.create( {id: interaction.user.id, name: interaction.user.username} ); }
		
		var tip = await Tip.findOne({ where: { tipper_id: tipper.id, match_id: match.id } });
		if (!tip) {
			tip = await Tip.create({ tipper_id: tipper.id, match_id: match.id, score_a: score_a });
		}
		tip.score_a = score_a;
		await tip.save();

		return collectedButton.update({ content: await printMatch(match, false, false, false), components: [pushed_buttons], ephemeral: true });

	} else if (commandName === 'matches') {

		const matches = await Match.findAll();
		const embed = new MessageEmbed().setTitle(`${ matches.length == 0 ? 'There are currently no ongoing matches' : 'Currently ongoing matches' }`);

		for (const match of matches) {
			const tip = await Tip.findOne( {where: {tipper_id: interaction.user.id, match_id: match.id}} );
			embed.addFields(
				{ name: `#${match.id}`, value: `${match.is_open ? `[open]` : '[closed]'}`, inline: true },
				{ name: match.team_a_id, value: `${(tip) ? `${tip.score_a}` : '-'}`, inline: true },
				{ name: match.team_b_id, value: `${(tip) ? `${4 - tip.score_a}` : '-'}`, inline: true },
			)	
		}
		return interaction.reply({ embeds: [embed], ephemeral: true });

	} else if (commandName === 'scoreboard') {

		const tippers = await Tipper.findAll({ order: [ ['points', 'DESC'] ] });

		var reply = 'Here\'s the current SpeedTips scoreboard:';
		for (const tipper of tippers) {
			var tag = '';
			if(tipper.is_admin) tag = '  (admin)'
			else if(tipper.is_mod) tag = '  (mod)'
			reply = reply.concat(`\n${tipper.points} - ${tipper.name}${tag}`);
		}
		return interaction.reply({ content: Formatters.codeBlock(reply), ephemeral: true });

	} else if (commandName === 'allmatches') {

		const matches = await Match.findAll({paranoid: false});
		var reply = 'Here are all matches including the already ended ones:\n'

		for (const match of matches) {
			reply = reply.concat(`\n${await printMatch(match.id, false, false, false)}`);
		}
		return interaction.reply(reply);

	} else if (commandName === 'seasontip') {

		let collected = null;

		if (tipper != null && tipper.season_tip != null && tipper.points > 0) {
			let buttons = new MessageActionRow().addComponents(
				new MessageButton().setCustomId(`ok`).setLabel('I understand').setStyle('DANGER'),
				new MessageButton().setCustomId(`no`).setLabel('I\'d rather not').setStyle('SECONDARY'),
			)
			let list = 'Your current season tip:\n'
			let tip = tipper.season_tip.split('_')
			for (let i = 0; i < tip.length; i++) { list = list.concat(`\n${i+1}) ${tip[i]}`); }
			await interaction.reply({ content: `***Changing your league tip will reset your points to 0.***\n\`\`\`${list}\`\`\``, components: [buttons], ephemeral: true });

			collected = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'BUTTON'})
				.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
			if (collected.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}
			if (collected.customId == 'no') {return collected.update({ content: 'Alright.', components: [] })}
		}
		else {
			let buttons = new MessageActionRow().addComponents(
				new MessageButton().setCustomId(`letgsgo`).setLabel('Let\'s go').setStyle('SUCCESS'),
			)
			await interaction.reply({ content: '***Make a season tip for big potential points at the end of the season.***', components: [buttons], ephemeral: true });

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

		if (!tipper) { tipper = await Tipper.create({ id: interaction.user.id, name: interaction.user.username }); }

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

		let reply_plus = `Your league tip:\n\`\`\`\n${reply}\`\`\`\n***Your league tip has been ${(tipper.season_tip != null ? 'updated' : 'saved')}.***`;
		return collected.update({ content: reply_plus, components: [] });

	} else if (!tipper || !tipper.is_mod && !tipper.is_admin) {

		return interaction.reply({ content: ` /${commandName} is for moderators only.`, ephemeral: true })

	} else if (commandName === 'creatematch') {

		const match_id = interaction.options.getInteger('match_id');
		if (await Match.count({ where: {id: match_id}, paranoid: false}) > 0) {return interaction.reply({ content: `A match #${match_id} already exists.`, ephemeral: true })};

		const teams = await Team.findAll();
		const select = new MessageSelectMenu().setCustomId('creatematch').setPlaceholder(`Select the two teams for match #${match_id}`);
		for (const team of teams) {
			select.addOptions([ {label: team.id, description: await printPlayers(team), value: `${team.id}`} ])
				.setMinValues(2).setMaxValues(2);
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });

		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

	
		//user makes selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);

		const team_a = collectedSelect.values[0];
		const team_b = collectedSelect.values[1];

		const match = await Match.create({ id: match_id, team_a_id: team_a, team_b_id: team_b});
		await interaction.editReply({ content: 'The match has been added. *You can dismiss the message.*', components: [] });
		return interaction.channel.send(`Match **#${match.id} - ${team_a} vs ${team_b}** has been added. I wonder, who will win. 🤔`);

	} else if (commandName === 'closematch') {

		const matches = await Match.findAll();
		if (matches == 0) {return interaction.reply({ content: 'There are currently no matches to close/open.', ephemeral: true })};

		const select = new MessageSelectMenu().setCustomId('closematch').setPlaceholder(`Select a match to close/open`);
		for (const match of matches) {
			select.addOptions([ {label: `${await printMatch(match, true, false, false)}`, 
								description: `${await printPlayers(match.team_a_id)}   vs   ${await printPlayers(match.team_b_id)}`, 
								value: `${match.id}`} ])
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });
		
		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		//user makes selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);

		const match_id = collectedSelect.values[0];
		const match = await Match.findOne({ where: {id: match_id}});
		if (!match) return interaction.reply({ content: `Match #${match_id} already ended or was deleted.`, ephemeral: true });

		match.is_open = !match.is_open;
		match.save();
		const reply = ( match.is_open == false ? 'closed' : 'reopened');

		await interaction.editReply({ content: `**Match #${match.id}** has been ${reply}. *You can dismiss the message.*`, components: [] });
		return interaction.channel.send(`Match #${match.id} - ${match.team_a_id} vs ${match.team_b_id} has been ${reply} for tips.`);

	} else if (commandName === 'endmatch') {

		matches = await Match.findAll();
		if(matches.length == 0) {return interaction.reply({ content: 'There are currently no matches to tip on.', ephemeral: true })};

		const select = new MessageSelectMenu().setCustomId('endmatch').setPlaceholder(`Select a match to end.`);
		for (const match of matches) {
			select.addOptions([ {label: `${await printMatch(match, true, false, false)}`, 
								description: `${await printPlayers(match.team_a_id)}   vs   ${await printPlayers(match.team_b_id)}`, 
								value: `${match.id}`} ])
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });

		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user made a selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);

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
		console.log(`${interaction.user.tag} pressed /${commandName} ${collectedSelect.values[0]} ${collectedButton.customId}`);

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
			
			if      (result_diff == tip_diff)                         { 
				tipper.points += (tipper.season_tip === null ? 0 : 3); 
				threeP = threeP.concat(`${(tipper.season_tip === null ? '~~' : '')}${tipper.name}${(tipper.season_tip === null ? '~~' : '')}`); 
			} else if (Math.sign(result_diff) == Math.sign(tip_diff))   { 
				tipper.points += (tipper.season_tip === null ? 0 : 1);   
				oneP =   oneP.concat(`${(tipper.season_tip === null ? '~~' : '')}${tipper.name}${(tipper.season_tip === null ? '~~' : '')}`); 
			} else {
				zeroP =  zeroP.concat(`${(tipper.season_tip === null ? '~~' : '')}${tipper.name}${(tipper.season_tip === null ? '~~' : '')}`); 
			}

			tipper.save();
			await tip.destroy();
		}
		await match.destroy();

		reply = reply.concat(`▬▬▬▬▬▬▬▬▬▬▬▬▬\n**3 Points go to:**\n> ${threeP.sort().join(", ")}\n\n**1 Point goes to:**\n> ${oneP.sort().join(", ")}\n\n**NO Points go to:**\n> ${zeroP.sort().join(", ")}\n▬▬▬▬▬▬▬▬▬▬▬▬▬`);
		return interaction.channel.send(reply);

	} else if (commandName === 'deletematch') {
		
		const matches = await Match.findAll();
		if (matches == 0) {return interaction.reply({ content: 'There are currently no matches to delete', ephemeral: true })};

		const select = new MessageSelectMenu().setCustomId('addplayer').setPlaceholder(`Select a match to delete.`);
		for (const match of matches) {
			select.addOptions([ {label: `${await printMatch(match, true, false, false)}`, 
								description: `${await printPlayers(match.team_a_id)}   vs   ${await printPlayers(match.team_b_id)}`, 
								value: `${match.id}`} ])
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });
	
		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

		
		//user makes selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);

		const match_id = collectedSelect.values[0];
		const match = await Match.findOne({ where: {id: match_id}});

		const tips = await match.getTips();
		for (const tip of tips) {await tip.destroy({force: true});}
		await match.destroy({force: true});

		await interaction.editReply({ content: `Match **#${match_id} deleted.** *You can dismiss the message.*`, components: [] })
		return interaction.channel.send(`**Match #${match_id}** has been deleted.`)

	} else if (commandName === 'relinquishmod') {

		tipper.is_mod = false;
		tipper.save();

		return interaction.reply(`${tipper.name} has relinquished mod.`);
	
	} else if (!tipper.is_admin) {

		return interaction.reply({ content: ` /${commandName} is for admins only.`, ephemeral: true })

	} else if (commandName === 'endseason') {

		let buttons = new MessageActionRow().addComponents(
			new MessageButton().setCustomId(`ok`).setLabel('I understand').setStyle('DANGER'),
			new MessageButton().setCustomId(`no`).setLabel('I\'d rather not').setStyle('SECONDARY'),
		)
		await interaction.reply({ content: `Ending the season will award every tipper their season tip score.\n***Only do this if the season is actually over, and be sure to inout the correct results!***`, components: [buttons], ephemeral: true });

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

	} else if (commandName === 'restorematch') {

		const match_id = interaction.options.getInteger('match_id');

		const match = await Match.findOne({ where: {id: match_id}, paranoid: false });
		if (!match) return interaction.reply({ content: 'That match doesn\'t exist.', ephemeral: true });
		const ongoing_match = await Match.findOne({ where: {id: match_id} });
		if (ongoing_match != null) return interaction.reply({ content: 'That match has not been ended.', ephemeral: true });

		const tips = await match.getTips({paranoid: false});
		if (tips.length == 0 || match.result_a == 99) {
			for (const tip of tips) { await tip.restore(); }
			match.is_open = false;
			match.result_a = null;
			match.save();
			await match.restore();
			return interaction.reply(`${await printMatch(match, false, false, false)} has been restored.\nEither this match was cancelled or no one tipped on it.\n`);
		}

		let result_diff = 2*match.result_a - 4;
		let threeP = new Array();
		let oneP = new Array();
		let reply = `**${await printMatch(match, false, false, false)}** has been restored.\n`;

		for (const tip of tips) {
			const tip_diff = 2*tip.score_a - 4;		
			const tipper = await tip.getTipper();

			if 		(result_diff == tip_diff) 							{ tipper.points -= 3; threeP = threeP.concat(`${tipper.name}`); }
			else if (Math.sign(result_diff) == Math.sign(tip_diff)) 	{ tipper.points -= 1;   oneP =   oneP.concat(`${tipper.name}`); }

			tipper.save();
			await tip.restore();
		}
		
		match.is_open = false;
		match.result_a = null;
		match.save();
		await match.restore();

		reply = reply.concat(`▬▬▬▬▬▬▬▬▬▬▬▬▬\n**3 Points retracted from:**\n> ${threeP.sort().join(", ")}\n\n**1 Point retracted from:**\n> ${oneP.sort().join(", ")}\n▬▬▬▬▬▬▬▬▬▬▬▬▬`);
		return interaction.reply(reply);

	} else if (commandName === 'deletetip') {

		let matches = await Match.findAll();
		if(matches.length == 0) {return interaction.reply({ content: 'There are currently no matches.', ephemeral: true })};

		let select = new MessageSelectMenu().setCustomId('deletetip').setPlaceholder(`Select a match from which to delete a tip.`);
		for (const match of matches) {
			select.addOptions([ {label: `${await printMatch(match, true, false, false)}`, 
								value: `${match.id}`} ])
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });

		let collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user made a selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);

		const match_id = collectedSelect.values[0];
		const match = await Match.findOne({ where: {id: match_id} });
		if (!match) return collectedSelect.update({ content: `Match #${match_id} already ended or was deleted.`, components: [] });

		const tips = await Tip.findAll({ where: {match_id: match_id}});
		if(tips.length == 0) return interaction.editReply({ content: 'There are currently no tips for on match.', components: [] });

		select = new MessageSelectMenu().setCustomId('deletetip').setPlaceholder(`Select a person to remove their tip from match #${match_id}`);
		for (const tip of tips) {
			const tipper = await tip.getTipper();
			select.addOptions([ {label: `${tipper.name}`, 
			value: `${tip.tipper_id}`} ])
		}
		await collectedSelect.update({ components: [new MessageActionRow().addComponents(select)] });

		collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) })
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user made a selection
		console.log(`${interaction.user.tag} selected /${commandName} ${match_id} ${collectedSelect.values[0]}`);

		const tip = await Tip.findOne({ where: {match_id: match_id, tipper_id: collectedSelect.values[0]} });
		const tipper = await tip.getTipper();
		await collectedSelect.update({ content: `${tipper.name}\'s tip on match #${match_id} has been removed.`, components: [] })
		return tip.destroy();

	} else if (commandName === 'addpoints') {

		const tipper_id = interaction.options.getString('user_id');
		const addition = interaction.options.getInteger('points');

		tipper = await Tipper.findOne({ where: { id: tipper_id} })
		if(!tipper) return interaction.reply({ content: 'That person has not tipped anything yet.', ephemeral: true });

		tipper.points += addition;
		tipper.save();
		return interaction.reply( `${Math.abs(addition)} points have been ${(addition < 0) ? 'taken away from' : 'given to'} ${tipper.name}.` );

	} else if (commandName === 'teams') {

		const teams = await Team.findAll();

		var reply = 'Here\'s all the teams:\n';
		for (const team of teams) {reply = reply.concat(`\n${team.id}     (${await printPlayers(team)})`);}
		return interaction.reply({ content: Formatters.codeBlock(reply), ephemeral: true });

	} else if (commandName === 'addteam') {

		const team_id = interaction.options.getString('team_name');
		if (Team.count({ where: {id: team_id}}) > 0) return interaction.reply({ content: 'That team already exists.', ephemeral: true });

		await Team.create({ id: team_id });
		return interaction.reply({ content: `Team **${team_id}** has been created.`, ephemeral: true });

	} else if (commandName === 'deleteteam') {

		const select = new MessageSelectMenu().setCustomId('removeteam').setPlaceholder(`Select a team to delete.`);
		const teams = await Team.findAll();
		for (const team of teams) {
			select.addOptions([ {label: team.id, description: await printPlayers(team), value: `${team.id}`} ])
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });
	
		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. You can dismiss the message.', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

		
		//user makes selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);

		const team_id = collectedSelect.values[0];
		const team = await Team.findOne({ where: {id: team_id}});

		const players = await team.getPlayers();
		for (const player of players) { player.destroy();}

		const tippers = await Tipper.findAll();
		for (const tipper of tippers) {
			let tip = tipper.season_tip.split('_');
			for (i = 0; i < tip.length; i++) {
				if (tip[i] === team_id) {tip.splice(i, 1); i = tip.length}
			}
			tipper.season_tip = tip.join('_')
			tipper.save();
		}

		team.destroy();
		return interaction.editReply({ content: `**Team ${team_id}** has been deleted.`, components: [] });

	} else if (commandName === 'renameteam') {

		const new_id  = interaction.options.getString('new_name');
		if (Team.count({ where: {id: new_id}}) > 0) return interaction.reply({ content: 'This team already exists.', ephemeral: true });

		const teams = await Team.findAll();

		const select = new MessageSelectMenu().setCustomId('renameteam').setPlaceholder(`Select a team whose name to change to ${new_id}.`);
		for (const team of teams) {
			select.addOptions([ {label: team.id, description: await printPlayers(team), value: `${team.id}`} ])
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });
	
		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. You can dismiss the message.', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

		
		//user makes selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);
		
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

	} else if (commandName === 'addplayer') {

		const player_id = interaction.options.getString('player_name');
		if (Player.count({ where: {id: player_id}}) > 0) return interaction.reply({ content: 'This player is already in a team.', ephemeral: true });

		const teams = await Team.findAll();

		const select = new MessageSelectMenu().setCustomId('addplayer').setPlaceholder(`Select a team to add ${player_id} to.`);
		for (const team of teams) {
			select.addOptions([ {label: team.id, description: await printPlayers(team), value: `${team.id}`} ])
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });
	
		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. You can dismiss the message.', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

		
		//user makes selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);
		
		const team_id = collectedSelect.values[0];
		await Player.create({ id: player_id, team_id: team_id});

		return interaction.editReply({ content: `Player **${player_id}** has been added to Team **${team_id}**`, components: [] });

	} else if (commandName === 'deleteplayer') {

		const teams = await Team.findAll();
		let select = new MessageSelectMenu().setCustomId('deleteplayer').setPlaceholder(`Select a team from which you want to delete a player.`);
		for (const team of teams) {
			select.addOptions([ {label: team.id, description: await printPlayers(team), value: `${team.id}`} ])
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });

		let collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user makes a selection
		const team = await Team.findOne({ where: {id: collectedSelect.values[0]}});
		const players = await team.getPlayers();
		select = new MessageSelectMenu().setCustomId('deleteplayer').setPlaceholder(`Select a player to delete.`);
		for (const player of players) {
			select.addOptions([ {label: player.id, value: `${player.id}`} ])
		}
		await collectedSelect.update({ components: [new MessageActionRow().addComponents(select)] });

		collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. *You can dismiss the message.*', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}


		// user makes a selection
		const player = await Player.findOne({ where: {id: collectedSelect.values[0]}})
		player.destroy();
		await collectedSelect.update({ content: `Player '${collectedSelect.values[0]}' from team '${team.id}' has been deleted.`, components: [] });

	} else if (commandName === 'deletetipper') {

		const select = new MessageSelectMenu().setCustomId('removetipper').setPlaceholder(`Select a tipper to delete.`);
		const tippers = await Tipper.findAll();
		for (const tipper of tippers) {
			var tag = '';
			if (tipper.is_admin) tag = '[admin] ';
			else if (tipper.is_mod) tag = '[mod] ';
			select.addOptions([ {label: tipper.name, description: `${tipper.points}pts ${tag} ${tipper.id}`, value: `${tipper.id}`} ])
		}
		await interaction.reply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });
	
		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. You can dismiss the message.', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

		
		//user makes selection
		console.log(`${interaction.user.tag} selected /${commandName} ${collectedSelect.values[0]}`);

		let tipper_id = collectedSelect.values[0];
		if (tipper_id === 'null') tipper_id = null;
		const tipper = await Tipper.findOne({ where: {id: tipper_id}});
		const tipper_name = tipper.name;

		const tips = await tipper.getTips();
		for (const tip of tips) { tip.destroy(); }

		tipper.destroy();
		return interaction.editReply({ content: `Tipper **${tipper_name}** (${tipper_id}) has been deleted.`, components: [] });

	} else if (commandName === 'addmod') {

		const tipper_id = interaction.options.getString('user_id');
		const tipper_name = interaction.options.getString('user_name');

		let tipper = await Tipper.findOne({ where: { id: tipper_id } })
		if(!tipper) { tipper = await Tipper.create({ id: tipper_id, name: tipper_name});}
		tipper.is_mod = !tipper.is_mod;
		tipper.save();

		return interaction.reply(`${tipper.name} has been ${( tipper.is_mod == true ? 'added as a mod' : 'removed from the mods')}.`);

	} else if (commandName === 'addadmin') {

		const tipper_id = interaction.options.getString('user_id');
		const tipper_name = interaction.options.getString('user_name');

		let tipper = await Tipper.findOne({ where: { id: tipper_id} })
		if(!tipper) { tipper = await Tipper.create({ id: tipper_id, name: tipper_name }); }
		tipper.is_admin = true;
		tipper.save();

		return interaction.reply(`${tipper.name} has been added as an admin.`);

	} else if (commandName === 'relinquishadmin') {

		tipper.is_admin = false;
		tipper.save();

		return interaction.reply(`${interaction.name} has relinquished admin.`);
	
	} return;
});

//#endregion COMMANDS

//#region FUNCTIONS

async function printPlayers(team) {

	if (typeof team == 'string') {
		team = await Team.findOne({ where: {id: team} })
		if(!team) return 'team not found';
	}

	const players = await team.getPlayers();
	var reply = '';
	for (const player of players) {
		reply = reply.concat(`${player.id}, `);
	}
	return reply.slice(0,-2);
}
async function printMatch(match, print_open, print_result, line_break) {

	if (typeof match == 'number') {
		match = await Match.findOne({ where: {id: match}, paranoid: false })
		if(!match) return 'match not found';
	}
	
	open_tag = `${ print_open ? `${ match.is_open ? ` [open] ` : `[closed] ` }` : ''}`;
	result = `${ print_result ? ` ${match.result_a} - ${4 - match.result_a} ` : ` vs `}`;
	return `${open_tag}#${match.id}:${line_break ? `\n` : '   '}${match.team_a_id} ${result} ${match.team_b_id}`;
}

//#endregion FUNCTIONS

client.once('ready', async () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

client.login(token);
