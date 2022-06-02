module.exports = (sequelize, DataTypes) => {
	return sequelize.define('team', {
		id:			{type: DataTypes.STRING, primaryKey: true},
	}, {
	});
};