const { SlashCommandBuilder } = require('@discordjs/builders');
const { isAdmin } = require('../index.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('kill')
        .setDescription('[Admin] Shut down bot.'),
    async execute(interaction) {

        if(!isAdmin(interaction)) {return interaction.reply({ content: `Only Admins can use this command.`, ephemeral: true })}
        await interaction.editReply({ content: `The bot was shut down.`, ephemeral: true })

        process.exit();
	},
};