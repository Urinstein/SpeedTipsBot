const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu }  = require('discord.js');
const { Tipper } = require('../dbObjects.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deletetipper')
		.setDescription('Delete a tipper from SpeedTipsBot. (they will lose their points)'),

	async execute(interaction, tipper) {
		if (!tipper || !tipper.is_admin) {
			return interaction.editReply({ content: ` /${interaction.commandName} is for admins only.`, ephemeral: true })
		}
		
		const select = new MessageSelectMenu().setCustomId('removetipper').setPlaceholder(`Select a tipper to delete.`);
		const tippers = await Tipper.findAll();
		for (const tipper of tippers) {
			var tag = '';
			if (tipper.is_admin) tag = '[admin] ';
			else if (tipper.is_mod) tag = '[mod] ';
			select.addOptions([ {label: tipper.name, description: `${tipper.points}pts ${tag} ${tipper.id}`, value: `${tipper.id}`} ])
		}
		await interaction.editReply({ components: [new MessageActionRow().addComponents(select)], ephemeral: true });
	
		const filter = i => { return i.message.interaction.id === interaction.id; };

		const collectedSelect = await interaction.channel?.awaitMessageComponent({ filter, idle: 60 * 1000, componentType: 'SELECT_MENU'})
			.catch(_e => { return interaction.editReply({ content: 'This menu has expired after 60 seconds. You can dismiss the message.', components: [] }) });
		if (collectedSelect.content === 'This menu has expired after 60 seconds. *You can dismiss the message.*') {return}

		
		//user makes selection
		console.log(`${interaction.user.tag} selected /${interaction.commandName} ${collectedSelect.values[0]}`);

		let tipper_id = collectedSelect.values[0];
		if (tipper_id === 'null') tipper_id = null;
		tipper = await Tipper.findOne({ where: {id: tipper_id}});
		const tipper_name = tipper.name;

		const tips = await tipper.getTips({ paranoid: false});
		for (const tip of tips) { tip.destroy({force: true}); }

		tipper.destroy();
		return interaction.editReply({ content: `Tipper **${tipper_name}** (${tipper_id}) has been deleted.`, components: [] });
	},
};