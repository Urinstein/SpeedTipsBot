module.exports = (sequelize, DataTypes) => {
	return sequelize.define('static', {
		id: 				{type: DataTypes.INTEGER, primaryKey: true},
		registration_id:	{type: DataTypes.STRING, defaultValue: null},
		captain_id:			{type: DataTypes.STRING, defaultValue: null},
		scoreboard_id:		{type: DataTypes.STRING, defaultValue: null},
		stats_id:			{type: DataTypes.STRING, defaultValue: null},
		total_matches:		{type: DataTypes.INTEGER, defaultValue: 0},
		phase:				{type: DataTypes.INTEGER, defaultValue: 1}
	}, {
		
	});
};