const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});

const Tipper = require('./models/Tipper.js')(sequelize, Sequelize.DataTypes);
const Tip = require('./models/Tip.js')(sequelize, Sequelize.DataTypes);
const Match = require('./models/Match.js')(sequelize, Sequelize.DataTypes);
const Team = require('./models/Team.js')(sequelize, Sequelize.DataTypes);
const Static = require('./models/Static.js')(sequelize, Sequelize.DataTypes);

Tipper.hasMany(Tip, {foreignKey: 'tipper_id' });
Tip.belongsTo(Tipper, {foreignKey: 'tipper_id' });

Match.hasMany(Tip, {foreignKey: 'match_id' });
Tip.belongsTo(Match, {foreignKey: 'match_id' });

Team.hasMany(Match, { as: 'home_matches', foreignKey: 'team_a_id' });
Match.belongsTo(Team, {as: 'team_a', foreignKey: 'team_a_id' });

Team.hasMany(Match, { as: 'away_matches', foreignKey: 'team_b_id' });
Match.belongsTo(Team, {as: 'team_b', foreignKey: 'team_b_id' });

module.exports = { Tipper, Tip , Match, Team, Static };