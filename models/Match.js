module.exports = (sequelize, DataTypes) => {
	return sequelize.define('match', {
		id: 			{type: DataTypes.INTEGER, primaryKey: true},
		team_a_id: 		{type: DataTypes.STRING, defaultValue: null},
		team_b_id: 		{type: DataTypes.STRING, defaultValue: null},
		is_open: 		{type: DataTypes.BOOLEAN, defaultValue: true},
		is_short_notice:{type: DataTypes.BOOLEAN, defaultValue: false},
		result_a:		{type: DataTypes.INTEGER, defaultValue: null},
		time:			{type: DataTypes.DATE, defaultValue: null},
		announcement_id:{type: DataTypes.STRING, defaultValue: null},
		tipping_id:		{type: DataTypes.STRING, defaultValue: null},
	}, {
		paranoid: true,
	});
};