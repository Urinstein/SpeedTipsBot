const { SlashCommandBuilder } = require('@discordjs/builders');
const { isTeamCaptain, loggingAction, loggingError, indent } = require('../index.js');
const { Match } = require('../dbObjects.js');
const { event_type, event_number, } = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('submitvideo')
		.setDescription('Submit a video of a match to the website.')
        .addIntegerOption(	option => option.setName('id')		.setDescription('match #number')		.setRequired(true))
        .addStringOption(	option => option.setName('link')	.setDescription('video link')			.setRequired(true))
        .addStringOption(	option => option.setName('streamer').setDescription('streamer login')		.setRequired(true))
        .addBooleanOption(	option => option.setName('pov')		.setDescription('is this vdoei a pov?')	.setRequired(true))
        .addStringOption(	option => option.setName('cocaster').setDescription('co-caster login'))
		,

	async execute(interaction) {

		try {
			//if (!isTeamCaptain(interaction, 'dummy', 'dummy')) { return interaction.editReply({ content: `Only captains can schedule matches.` }) }

			const match_id = interaction.options.getInteger('id');
			const match = await Match.findOne({ where: {id: match_id}, paranoid: false, include: ['team_a','team_b'] });
			if(!match) {return interaction.editReply({ content: `[Match #${indent(match_id, 3, '0')}] does not exist!` })}	
			//if(match.result_a === null) {return interaction.editReply({ content: `[Match #${indent(match_id, 3, '0')}] was not played yet!` })}

			const link = interaction.options.getString('link');
			const streamer = interaction.options.getString('streamer');
			const cocaster = interaction.options.getString('cocaster');
			const pov = interaction.options.getBoolean('pov');

			const res = await fetch('https://speedball.the-dmark.com/stats/post/video-data.php',{
				method: 'POST',
				body: JSON.stringify({
					event: event_type,
					event_number: event_number,
					match_number: match.id,
					link: link,
					streamer_login: streamer,
					co_caster_login: cocaster,
					is_self_pov: pov
				}),
				headers: { 
					'content-type': 'application/json; charset=UTF-8',
					'accept': '*/*',
					'user-agent':'*'
				},
			})
			if(res.ok){
				//const data = await res.json();
				loggingAction(`[Match #${indent(match.id, 3, '0')}] link has been sent to website.`)
				return interaction.editReply(`Thanks! Your link has been send to the website.`)
			}
			else return loggingError(`[Match #${indent(match.id, 3, '0')}] link could not be sent to website.`,'','')


		} catch (error) {
			await loggingError('schedulematch.js', `${interaction.user.tag} used /${interaction.commandName}`, error)
			return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
		}

	},
};