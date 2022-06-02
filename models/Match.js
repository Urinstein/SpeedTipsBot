module.exports = (sequelize, DataTypes) => {
	return sequelize.define('match', {
		id: 		{type: DataTypes.INTEGER, primaryKey: true},
		team_a_id: 	DataTypes.STRING,
		team_b_id: 	DataTypes.STRING,
		is_open: 	{type: DataTypes.BOOLEAN, defaultValue: true},
		result_a:	{type: DataTypes.INTEGER, defaultValue: null},
	}, {
		paranoid: true,
	});
};