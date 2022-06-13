const { Client, Formatters, Intents, Collection}  = require('discord.js');
const { Tipper } = require('./dbObjects.js');
const { token } = require('./config.json');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

//#region CREATE COMMANDS

const fs = require('node:fs');
const path = require('node:path');
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	client.commands.set(command.data.name, command);
	console.log(`/${command.data.name} added.`)
}

//#endregion CREATE COMMANDS

//#region EXECUTE COMMANDS

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
	if (interaction.channel.name != 'speedtips') return interaction.reply({ content: 'SpeedTipsBot only works in #speedtips', ephemeral: true });

	const command = client.commands.get(interaction.commandName);
	if (!command) return;
	console.log(`${interaction.user.tag} triggered /${interaction.commandName}`);

	await interaction.reply({ content: `/${interaction.commandName}`, loading: true, ephemeral: true })

	var tipper = await Tipper.findOne({ where: {id: interaction.user.id} });
	if (tipper != null) {tipper.name = interaction.user.username; tipper.save();}
	
	try {
		await command.execute(interaction, tipper, client);
	} catch (error) {
		console.error(error);
		
		await client.users.cache.get("95664776423673856").send(Formatters.codeBlock(
			`${interaction.user.tag} triggered /${interaction.commandName}\n\n${error.message}`
		));
		
		return interaction.editReply({ content: 'There was an error while executing this command!\nThe error has been submitted to **Urinstein**.', components: [] });
	}
});

//#endregion EXECUTE COMMANDS

client.once('ready', async () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

client.login(token);