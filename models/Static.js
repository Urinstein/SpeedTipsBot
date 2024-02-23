module.exports = (sequelize, DataTypes) => {
	return sequelize.define('static', {
		id: 				{type: DataTypes.INTEGER, primaryKey: true},
		registration_id:	{type: DataTypes.STRING, defaultValue: null},
		captain_id:			{type: DataTypes.STRING, defaultValue: null},
		scoreboard_id:		{type: DataTypes.STRING, defaultValue: null},
		stats_id:			{type: DataTypes.STRING, defaultValue: null},
		allmatches1_id:		{type: DataTypes.STRING, defaultValue: null},
		allmatches2_id:		{type: DataTypes.STRING, defaultValue: null},
		allmatches3_id:		{type: DataTypes.STRING, defaultValue: null},
		allmatches4_id:		{type: DataTypes.STRING, defaultValue: null},
	}, {
		
	});
};