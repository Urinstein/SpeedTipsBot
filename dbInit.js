const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});

require('./models/Match.js')(sequelize, Sequelize.DataTypes);
const Tipper = require('./models/Tipper.js')(sequelize, Sequelize.DataTypes);
require('./models/Tip.js')(sequelize, Sequelize.DataTypes);
const Team = require('./models/Team.js')(sequelize, Sequelize.DataTypes);
const Player = require('./models/Player.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
	
	const init = [
		Tipper.upsert({ id: '95664776423673856', name: 'Urinstein', is_mod: true, is_admin: true }),
		Tipper.upsert({ id: '160817623318134784', name: 'HYPE', is_mod: true, is_admin: true }),
		Tipper.upsert({ id: '315639032757616644', name: 'janfo', is_mod: true }),

		Team.upsert({ id: 'Pray4' }),
		Player.upsert({ id: 'Hir0s', team_id: 'Pray4' }),
		Player.upsert({ id: 'Ekinox', team_id: 'Pray4' }),
		Player.upsert({ id: 'Liber', team_id: 'Pray4' }),

		Team.upsert({ id: 'Irae' }),
		Player.upsert({ id: 'HawKen', team_id: 'Irae' }),
		Player.upsert({ id: 'ChairTic', team_id: 'Irae' }),
		Player.upsert({ id: 'Cobralala', team_id: 'Irae' }),

		Team.upsert({ id: 'Team 3' }),
		Player.upsert({ id: 'peachy', team_id: 'Team 3' }),
		Player.upsert({ id: 'Pink', team_id: 'Team 3' }),
		Player.upsert({ id: 'ilevelin', team_id: 'Team 3' }),

		Team.upsert({ id: 'Dignity' }),
		Player.upsert({ id: 'Tropic', team_id: 'Dignity' }),
		Player.upsert({ id: 'Echo', team_id: 'Dignity' }),
		Player.upsert({ id: 'Dan', team_id: 'Dignity' }),

		Team.upsert({ id: 'Flashback' }),
		Player.upsert({ id: 'janfo', team_id: 'Flashback' }),
		Player.upsert({ id: 'Dmark', team_id: 'Flashback' }),
		Player.upsert({ id: 'JaCulT', team_id: 'Flashback' }),

		Team.upsert({ id: 'Seek&Peek' }),
		Player.upsert({ id: 'Gamer0x', team_id: 'Seek&Peek' }),
		Player.upsert({ id: 'Greif', team_id: 'Seek&Peek' }),
		Player.upsert({ id: 'Ukkepuk', team_id: 'Seek&Peek' }),

		Team.upsert({ id: 'Double-U' }),
		Player.upsert({ id: 'pleb', team_id: 'Double-U' }),
		Player.upsert({ id: 'efg', team_id: 'Double-U' }),
		Player.upsert({ id: 'Grrr', team_id: 'Double-U' }),

		Team.upsert({ id: 'Hadouken' }),
		Player.upsert({ id: 'Aurel', team_id: 'Hadouken' }),
		Player.upsert({ id: 'Kabz', team_id: 'Hadouken' }),
		Player.upsert({ id: 'monk', team_id: 'Hadouken' }),

		Team.upsert({ id: 'MVP' }),
		Player.upsert({ id: 'Fantome', team_id: 'MVP' }),
		Player.upsert({ id: 'Gami', team_id: 'MVP' }),
		Player.upsert({ id: 'Sam', team_id: 'MVP' }),

		Team.upsert({ id: 'Urinstein' }),
		Player.upsert({ id: 'Smörg', team_id: 'Urinstein' }),
		Player.upsert({ id: 'HYPE', team_id: 'Urinstein' }),
		Player.upsert({ id: 'Zoomey', team_id: 'Urinstein' }),

		Team.upsert({ id: 'Project 11' }),
		Player.upsert({ id: 'RStyle', team_id: 'Project 11' }),
		Player.upsert({ id: 'Janni', team_id: 'Project 11' }),
		Player.upsert({ id: 'Nozzo', team_id: 'Project 11' }),

		Team.upsert({ id: 'Knaves' }),
		Player.upsert({ id: 'Elias', team_id: 'Knaves' }),
		Player.upsert({ id: 'Ivan', team_id: 'Knaves' }),
		Player.upsert({ id: 'Q', team_id: 'Knaves' }),
	];

	await Promise.all(init);
	console.log('Database synced');
	sequelize.close();
	
}).catch(console.error);