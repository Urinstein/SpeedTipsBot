module.exports = (sequelize, DataTypes) => {
	return sequelize.define('tipper', {
		id: 				{type: DataTypes.STRING, primaryKey: true},
		points: 			{type: DataTypes.INTEGER, defaultValue: 0},
		season_tip: 		{type: DataTypes.STRING , defaultValue: null},
		is_admin: 			{type: DataTypes.BOOLEAN, defaultValue: false},
		dm_id:				{type: DataTypes.STRING, defaultValue: null},
		dm_setting_tips:	{type: DataTypes.BOOLEAN, defaultValue: true},
		dm_setting_ann:		{type: DataTypes.BOOLEAN, defaultValue: true},
		dm_tips:			{type: DataTypes.INTEGER, defaultValue: 0},
		channel_tips:		{type: DataTypes.INTEGER, defaultValue: 0},
	}, {
		timestamps: false,
	});
};