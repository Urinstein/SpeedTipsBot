const { ActionRowBuilder, ButtonBuilder }  = require('discord.js');

const button_postpone = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_postpone_match`).setLabel('postpone').setStyle('Secondary'),
)

const button_postponed = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_postponed`).setLabel('postponed').setStyle('Danger').setDisabled(true),
)

const button_cancelled = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_cancelled`).setLabel('cancelled').setStyle('Danger').setDisabled(true),
)

const button_closed = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_closed`).setLabel('closed').setStyle('Danger').setDisabled(true),
)

const button_dm_setting_ann = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_dm_setting`).setLabel('sending tips and announcements').setStyle('Primary'),
)
const button_dm_setting_tips = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_dm_setting`).setLabel('sending tips').setStyle('Success'),
)
const button_dm_none = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_dm_setting`).setLabel('not sending dms').setStyle('Danger'),
)

function buttons_dm_result (score_a, result_a) {
	var style = ['Secondary', 'Secondary', 'Secondary', 'Secondary', 'Secondary'];
	style[score_a] = 'Danger';
	style[result_a] = 'Success';
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`4`).setLabel('4 - 0').setStyle(`${( style[4] )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`3`).setLabel('3 - 1').setStyle(`${( style[3] )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`2`).setLabel('2 - 2').setStyle(`${( style[2] )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`1`).setLabel('1 - 3').setStyle(`${( style[1] )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`0`).setLabel('0 - 4').setStyle(`${( style[0] )}`).setDisabled(true),
	)
}

const button_open = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_open`).setLabel('open').setStyle('Success').setDisabled(true),
)

const button_register = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_register_tipping_account`).setLabel('Click to Register').setStyle('Primary'),
)

const button_short_notice = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_short_notice`).setLabel('short-notice').setStyle('Danger').setDisabled(true),
)

const buttons_tip = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`4`).setLabel('4 - 0').setStyle('Primary'),
	new ButtonBuilder().setCustomId(`3`).setLabel('3 - 1').setStyle('Primary'),
	new ButtonBuilder().setCustomId(`2`).setLabel('2 - 2').setStyle('Primary'),
	new ButtonBuilder().setCustomId(`1`).setLabel('1 - 3').setStyle('Primary'),
	new ButtonBuilder().setCustomId(`0`).setLabel('0 - 4').setStyle('Primary'),
)

const buttons_tip_closed = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`4`).setLabel('4 - 0').setStyle('Secondary').setDisabled(true),
	new ButtonBuilder().setCustomId(`3`).setLabel('3 - 1').setStyle('Secondary').setDisabled(true),
	new ButtonBuilder().setCustomId(`2`).setLabel('2 - 2').setStyle('Secondary').setDisabled(true),
	new ButtonBuilder().setCustomId(`1`).setLabel('1 - 3').setStyle('Secondary').setDisabled(true),
	new ButtonBuilder().setCustomId(`0`).setLabel('0 - 4').setStyle('Secondary').setDisabled(true),
)

var buttons_tip_red = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`4`).setLabel('4 - 0').setStyle('Danger'),
	new ButtonBuilder().setCustomId(`3`).setLabel('3 - 1').setStyle('Danger'),
	new ButtonBuilder().setCustomId(`2`).setLabel('2 - 2').setStyle('Danger'),
	new ButtonBuilder().setCustomId(`1`).setLabel('1 - 3').setStyle('Danger'),
	new ButtonBuilder().setCustomId(`0`).setLabel('0 - 4').setStyle('Danger'),
)

function buttons_tipped (score_a) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`4`).setLabel('4 - 0').setStyle(`${( score_a == 4 ? 'Primary' : 'Secondary' )}`),
		new ButtonBuilder().setCustomId(`3`).setLabel('3 - 1').setStyle(`${( score_a == 3 ? 'Primary' : 'Secondary' )}`),
		new ButtonBuilder().setCustomId(`2`).setLabel('2 - 2').setStyle(`${( score_a == 2 ? 'Primary' : 'Secondary' )}`),
		new ButtonBuilder().setCustomId(`1`).setLabel('1 - 3').setStyle(`${( score_a == 1 ? 'Primary' : 'Secondary' )}`),
		new ButtonBuilder().setCustomId(`0`).setLabel('0 - 4').setStyle(`${( score_a == 0 ? 'Primary' : 'Secondary' )}`),
	)
}

function buttons_tipped_closed (score_a) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`4`).setLabel('4 - 0').setStyle(`${( score_a == 4 ? 'Primary' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`3`).setLabel('3 - 1').setStyle(`${( score_a == 3 ? 'Primary' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`2`).setLabel('2 - 2').setStyle(`${( score_a == 2 ? 'Primary' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`1`).setLabel('1 - 3').setStyle(`${( score_a == 1 ? 'Primary' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`0`).setLabel('0 - 4').setStyle(`${( score_a == 0 ? 'Primary' : 'Secondary' )}`).setDisabled(true),
	)
}

function buttons_tipped_green_closed (result_a) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`4`).setLabel('4 - 0').setStyle(`${( result_a == 4 ? 'Success' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`3`).setLabel('3 - 1').setStyle(`${( result_a == 3 ? 'Success' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`2`).setLabel('2 - 2').setStyle(`${( result_a == 2 ? 'Success' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`1`).setLabel('1 - 3').setStyle(`${( result_a == 1 ? 'Success' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`0`).setLabel('0 - 4').setStyle(`${( result_a == 0 ? 'Success' : 'Secondary' )}`).setDisabled(true),
	)
}

function buttons_tipped_red_closed (result_a) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`4`).setLabel('4 - 0').setStyle(`${( result_a == 4 ? 'Danger' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`3`).setLabel('3 - 1').setStyle(`${( result_a == 3 ? 'Danger' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`2`).setLabel('2 - 2').setStyle(`${( result_a == 2 ? 'Danger' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`1`).setLabel('1 - 3').setStyle(`${( result_a == 1 ? 'Danger' : 'Secondary' )}`).setDisabled(true),
		new ButtonBuilder().setCustomId(`0`).setLabel('0 - 4').setStyle(`${( result_a == 0 ? 'Danger' : 'Secondary' )}`).setDisabled(true),
	)
}

const buttons_warning = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_confirm`).setLabel('I understand').setStyle('Danger'),
	new ButtonBuilder().setCustomId(`b_nevermind`).setLabel('nevermind').setStyle('Secondary'),
)

const button_phase_2 = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_phase_2`).setLabel('Start Phase 2').setStyle('Danger')
)

const button_end_event = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_end_event`).setLabel('Finish the event').setStyle('Danger')
)

const button_initialise = new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId(`b_initialise`).setLabel('Initialise').setStyle('Danger')
)



module.exports = { 
	button_postpone, 
	button_postponed, 
	button_cancelled,
	button_closed, 
	button_dm_setting_ann,
	button_dm_setting_tips,
	button_dm_none,
	buttons_dm_result,
	button_open, 
	button_register, 
	button_short_notice, 
	buttons_tip, 
	buttons_tip_closed, 
	buttons_tip_red,
	buttons_tipped,
	buttons_tipped_closed,
	buttons_tipped_green_closed,
	buttons_tipped_red_closed,
	buttons_warning,
	button_phase_2,
	button_end_event,
	button_initialise,
};