


### what users can do:

- anyone
    - register (button)
    - turn dm annoucenements on/off
    - turn tip dms on/off
    - tip in tipping_channel
    - tip in dms
        - tip with several configurations of dm settings
    - "retip"
    - /matches

- captains
    - /schedulematch
        - new match
        - reschedule Match
        - their own team, but not other teams
        - with or without year
    - postpone match (button)
    - /submitresult (might remvoe this)

- admins
    - do all that captains can, but for any team
    - /kill
    - /deploycommands
    - initialise the bot and start phase 2


### things that happen automatically

- first couple of posts get posted and pinned
- matches get closed on time
- scoreboard, stats and played matches get updated
- SpeedTipsBot tips a random result on every match
- results are fetched from website
- scheduled match times are sent to the website (also match cancellations)


### still needs doing:

- eventually add a check to request_result(), to see if the teams are the correct teams

- uncancel matches (?)

- /seasontip (currently no idea what his is even gonna be)
    - instead of registration have to do the season tips?
    - send dm with season tips



### some cleaner code perhaps?

- at this point, schedule_match() and reschedule_match() can be put into one function again

- make print_match() and add it to a bucnh fo places, instead of havignthe same kilometer long string everywhere

- remove points from tipper table and always create scoreboard completely fresh (?)
- put scoreboard and stats into their own functions

- add comments to all functions
- add try/catch to all functions
- change all funcs/vars to snake_case (to distinguish from discord.js functions)



### big maybies:

- people can tip with a command like before?
- bot can remind people of matches
    -> make a 'user' class and a 'reminder' class. The Intervall goes through all reminders and dm's the respective people. the user gets a field where they can fill in the hours/minutes.
- add odds to the point distribution?
- write a function, that replaces all Role-Mentions with Role-Name (for archiving)
- add a daily minigame, where "the ball carrier" can choose how to cap the pole and the first three people to react can choose where to shoot.
    - if the carrier caps, he gets the point, the first one to shoot him, gets the ball
- add buttons to dm_settings where people can have all their tips be sent or all currently open announcements (in case they change their mind on not having dms on)



### known bugs/issues:

- in dms cannot distinguish ended matches that you have voted correctly vs not at all



### commented OUT for development:

- intervall length
- short-notice length (in /schedulematch)
- .pin()

### commented IN for development:

- allowedMentions in /schedulematch new match and reannoucnement (announcement_channel.send)