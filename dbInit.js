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
require('./models/Static.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
	
	const init = [
		//Tipper.upsert({ id: '95664776423673856', name: 'Urinstein', is_mod: true, is_admin: true })
		
	];

	await Promise.all(init);
	console.log('Database synced');
	sequelize.close();
	
}).catch(console.error);