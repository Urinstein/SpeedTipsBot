module.exports = (sequelize, DataTypes) => {
	return sequelize.define('player', {
		id:    		{type: DataTypes.STRING, primaryKey: true},
        team_id:    DataTypes.STRING,
	}, {
	});
};