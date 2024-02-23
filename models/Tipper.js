module.exports = (sequelize, DataTypes) => {
	return sequelize.define('tipper', {
		id: 		{type: DataTypes.STRING, primaryKey: true},
		points: 	{type: DataTypes.INTEGER, defaultValue: 0},
		season_tip: {type: DataTypes.STRING , defaultValue: null},
		is_admin: 	{type: DataTypes.BOOLEAN, defaultValue: false},
		dm_id:		{type: DataTypes.STRING, defaultValue: null},
		dm_tips:	{type: DataTypes.BOOLEAN, defaultValue: true},
		dm_ann:		{type: DataTypes.BOOLEAN, defaultValue: true},
	}, {
		timestamps: false,
	});
};