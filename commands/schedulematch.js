const { SlashCommandBuilder } = require('@discordjs/builders');
const { isTeamCaptain, isAdmin, loggingError, indent, announce_match, cancel_match, reschedule_match } = require('../index.js');
const { Match } = require('../dbObjects.js');
const { short_notice_length } = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('schedulematch')
		.setDescription('[Captains] Announces your match.')
        .addIntegerOption(	option => option.setName('id')		.setDescription('match #number')								.setRequired(true))
        .addIntegerOption(	option => option.setName('hour')	.setDescription('hour')			.setMaxValue(23).setMinValue(0)	.setRequired(true))
        .addIntegerOption(	option => option.setName('minute')	.setDescription('minute')		.setMaxValue(59).setMinValue(0)	.setRequired(true))
        .addIntegerOption(	option => option.setName('day')		.setDescription('day')			.setMaxValue(31).setMinValue(1)	.setRequired(true))
        .addIntegerOption(	option => option.setName('month')	.setDescription('month')		.setMaxValue(12).setMinValue(1)	.setRequired(true))
        .addIntegerOption(	option => option.setName('year')	.setDescription('year')
			.addChoices(
				{name: `${new Date(Date.now()).getFullYear()}`, value: new Date(Date.now()).getFullYear()},
				{name: `${new Date(Date.now()).getFullYear()+1}`, value: new Date(Date.now()).getFullYear()+1}
			))
		.addBooleanOption(	option => option.setName('cancel')	.setDescription('cancel the match'))
		,

	async execute(interaction, client, myGuild, tipping_channel, announcement_channel) {

		try {
			const cancel = interaction.options.getBoolean('cancel');
			if (!isTeamCaptain(interaction, 'dummy', 'dummy')) { return interaction.editReply({ content: `Only captains can schedule their own matches.` }) }
			if (cancel && !isAdmin(interaction)) { return interaction.editReply({ content: `Only admins can cancel matches.` }) }

			const match_id = interaction.options.getInteger('id');
			const match = await Match.findOne({ where: {id: match_id}, paranoid: false, include: ['team_a','team_b'] });
			if(!match) {return interaction.editReply({ content: `[Match #${indent(match_id, 3, '0')}] does not exist!` })}

			if (!isTeamCaptain(interaction, match.team_a.role_id, match.team_b.role_id)) {
				return interaction.editReply({ content: `Your can schedule your own matches.` })}


			const day = interaction.options.getInteger('day');
			const month = interaction.options.getInteger('month');
			const year = interaction.options.getInteger('year');
			const hour = interaction.options.getInteger('hour');
			const minute = interaction.options.getInteger('minute');
			const time = new Date(`${(year ? year : (new Date(Date.now())).getFullYear())}-${month}-${day} ${hour}:${minute}`);
			if (isNaN(time)) {return interaction.editReply({ content: `The date is not formatted correctly.` })};
			const is_short_notice = (Date.now()+short_notice_length> time.getTime()) ? true : false;
			let is_open = !(Date.now() > time.getTime()) ? true : false;

			//var message = `[Match #${indent(match.id, 3, '0')}]  <@&${match.team_a.role_id}>  -  <@&${match.team_b.role_id}>\n${await team_roles[match.team_a.id].members.map(m=>m.displayName).join(', ')} - ${await team_roles[match.team_b.id].members.map(m=>m.displayName).join(', ')}\n${time.toLocaleString("en-GB", date_options)}`;

			if (cancel) {
				return cancel_match(interaction, match)
			} else if (!match.time || (match.is_short_notice && !is_short_notice)) {
				return announce_match(interaction, match, time, is_short_notice)
			} else {
				return reschedule_match(interaction, match, time, is_short_notice, is_open)
			}

//			return sendDate(match);

		} catch (error) {
			await loggingError('schedulematch.js', `${interaction.user.tag} used /${interaction.commandName}`, error)
			return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
		}

	},
};