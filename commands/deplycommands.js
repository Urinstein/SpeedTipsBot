const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('node:fs');
const path = require('node:path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deploycommands')
		.setDescription('Redeploy the bot\'s commands, when a command has been added, removed or had its arguments changed.'),

	async execute(interaction, tipper) {
		const commands = [];
		//const commandsPath = path.join(__dirname, 'commands');
		const commandFiles = fs.readdirSync(path.join(__dirname)).filter(file => file.endsWith('.js'));

		for (const file of commandFiles) {
			const filePath = path.join(path.join(__dirname), file);
			const command = require(filePath);
			commands.push(command.data.toJSON());
		}

		const rest = new REST({ version: '9' }).setToken(token);

		rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
			.then(() => console.log('Successfully registered application commands.'))
			.catch(console.error);

		return interaction.editReply({ content: `Successfully registered application commands.`, ephemeral: true });
	},
};