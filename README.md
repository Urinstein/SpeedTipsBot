


### what users can do:

- anyone
    - register/make season tip
    - turn dm annoucenements on/off
    - turn tip dms on/off
    - tip in tipping_channel
    - tip in dms
        - tip with several configurations of dm settings
    - "retip"
    - /matches
    - /submitvideo

- captains
    - /schedulematch
        - new match
        - reschedule Match
        - their own team, but not other teams
        - with or without year
    - /postpone match
    - /submitresult (just for dev)

- admins
    - do all that captains can, but for any team
    - cancel match (in /schedulematch)
    - /penalty
    - /kill
    - /deploycommands
    - initialise the bot and start phase 2


### things that happen automatically

- first couple of posts get posted and pinned
- private team threads are created and populated
- matches get closed on time
- scoreboard, stats and played matches get updated
- SpeedTipsBot tips a random result on every match
- results are fetched from website
- scheduled match times are sent to the website (also match cancellations)


### still needs doing:

- add average tip to the closed match post
- resolving the season tips at the end of the season



### some cleaner code perhaps?

- at this point, schedule_match() and reschedule_match() can be put into one function again maybe?

- make print_match() and add it to a bucnh fo places, instead of havignthe same kilometer long string everywhere

- add comments to all functions
- add try/catch to all functions
- change all funcs/vars to snake_case (to distinguish from discord.js functions)



### big maybies:

- bot can remind people of matches
    -> make a 'user' class and a 'reminder' class. The Intervall goes through all reminders and dm's the respective people. the user gets a field where they can fill in the hours/minutes.
- add odds to the point distribution?
- write a function, that replaces all Role-Mentions with Role-Name (for archiving)
- add buttons to dm_settings where people can have all their tips be sent or all currently open announcements (in case they change their mind on not having dms on)



### known bugs/issues:

- tipping does not always update the tip-dm buttons


### commented OUT for development: