const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

	class Team extends Model {
		async getMatches(options){
			let matches = [];
			matches = matches.concat(await this.getHome_matches(options));
			matches = matches.concat(await this.getAway_matches(options));
			matches.sort((a, b) => a.id - b.id);
			return matches
		}
	}
	Team.init({
		id: 				{type: DataTypes.INTEGER, primaryKey: true},
        role_id:			{type: DataTypes.STRING, defaultValue: null},
        div:				{type: DataTypes.INTEGER, defaultValue: null},
		matches_message_id:	{type: DataTypes.STRING, defaultValue: null},
	}, {
		sequelize,
		modelName: 'team',
		timestamps: false,
	});

	return Team
};