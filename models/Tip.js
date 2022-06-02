module.exports = (sequelize, DataTypes) => {
	return sequelize.define('tip', {
		tipper_id: 	DataTypes.STRING,
		match_id: 	DataTypes.INTEGER,
		score_a: 	DataTypes.INTEGER,
	}, {
		paranoid: true,
	});
};