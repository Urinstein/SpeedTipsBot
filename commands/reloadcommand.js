const { SlashCommandBuilder } = require('@discordjs/builders');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reloadcommand')
		.setDescription('Loads/deletes/reloads a command and redeploys commands if necessary.')
        .addStringOption(option => option.setName('command').setDescription('Enter the command\'s name, that you wish to reload').setRequired(true)),

	async execute(interaction, tipper, client) {
		const commandName = interaction.options.getString('command');

		const deleted = client.commands.delete(commandName);
		
		const filter = i => { return i.message.interaction.id === interaction.id; };

		const commandFile = fs.readdirSync(__dirname).filter(file => file == `${commandName}.js`);
		if(commandFile.length > 0) {
			const filePath = path.join(__dirname, `${commandName}.js`);
			delete require.cache[filePath];
			const command = require(filePath);
			client.commands.set(command.data.name, command);

			if (deleted) {return interaction.editReply({ content: `Command /${commandName} has been ***updated***.`, ephemeral: true });}

			await client.commands.get('deploycommands').execute(interaction, tipper, filter, client);
			return interaction.editReply({ content: `Command /${commandName} has been ***added*** and commands redeployed.`, ephemeral: true });
		}

		if (deleted) {
			await client.commands.get('deploycommands').execute(interaction, tipper, filter, client);
			return interaction.editReply({ content: `Command /${commandName} has been ***deleted*** and commands redeployed.`, ephemeral: true });
		}

		return interaction.editReply({ content: `Command /${commandName} *does not exist*.`, ephemeral: true });
	},
};