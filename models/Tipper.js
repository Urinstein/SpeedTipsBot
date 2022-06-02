module.exports = (sequelize, DataTypes) => {
	return sequelize.define('tipper', {
		id: 		{type: DataTypes.STRING, primaryKey: true},
		name:		{type: DataTypes.STRING, required: true},
		points: 	{type: DataTypes.INTEGER, defaultValue: 0},
		season_tip: {type: DataTypes.STRING , defaultValue: null},
		is_mod: 	{type: DataTypes.BOOLEAN, defaultValue: false},
		is_admin: 	{type: DataTypes.BOOLEAN, defaultValue: false},
	}, {
		timestamps: false,
	});
};