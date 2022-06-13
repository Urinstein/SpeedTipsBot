const { SlashCommandBuilder } = require('@discordjs/builders');
const { Match } = require('../dbObjects.js');
const { printMatch } = require('../helper-functions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('restorematch')
		.setDescription('Restore an ended match, taking away the awarded points in the process and auto-closes it.')
		.addIntegerOption(option => option.setName('match_id').setDescription('Enter the match id').setRequired(true)),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		const match_id = interaction.options.getInteger('match_id');

		const match = await Match.findOne({ where: {id: match_id}, paranoid: false });
		if (!match) return interaction.editReply({ content: 'That match doesn\'t exist.', ephemeral: true });
		const ongoing_match = await Match.findOne({ where: {id: match_id} });
		if (ongoing_match != null) return interaction.editReply({ content: 'That match has not been ended.', ephemeral: true });

		const tips = await match.getTips({paranoid: false});
		if (tips.length == 0 || match.result_a == 99) {
			for (const tip of tips) { await tip.restore(); }
			match.is_open = false;
			match.result_a = null;
			match.save();
			await match.restore();
			return interaction.editReply(`${await printMatch(match, false, false, false)} has been restored.\nEither this match was cancelled or no one tipped on it.\n`);
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
		return interaction.editReply(reply);
	},
};