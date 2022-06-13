const { Match, Team } = require('./dbObjects.js');

async function printPlayers(team) {

	if (typeof team == 'string') {
		team = await Team.findOne({ where: {id: team} })
		if(!team) return 'team not found';
	}

	const players = await team.getPlayers();
	var reply = '';
	for (const player of players) {
		reply = reply.concat(`${player.id}, `);
	}
	return reply.slice(0,-2);
}

async function printMatch(match, print_open, print_result, line_break) {

	if (typeof match == 'number') {
		match = await Match.findOne({ where: {id: match}, paranoid: false })
		if(!match) return 'match not found';
	}
	
	open_tag = `${ print_open ? `${ match.is_open ? ` [open] ` : `[closed] ` }` : ''}`;
	result = `${ print_result ? ` ${match.result_a} - ${4 - match.result_a} ` : ` vs `}`;
	return `${open_tag}#${match.id}:${line_break ? `\n` : '   '}${match.team_a_id} ${result} ${match.team_b_id}`;
}


module.exports = { printPlayers, printMatch };