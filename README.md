


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
        - schedueld Match
        - ended match
        - their own team, but not other teams
        - with or without year
    - reschedule (button)
    - cancel match (button)
    - /submitresult (only own team)

- admins
    - do all that captains can, but for any team
    - /kill
    - /deploycommands


### things that happen automatically

- first couple of posts get posted and pinned
- matches get closed on time
- scoreboard, stats and played matches get updated
- SpeedTipsBot tips a random result on every match


### still needs doing:

- "spacing functions" to add zeroes, or spaces to specific length of string (replace "space()" in /submitresult //edit stats) (also use for every Match#)
- make a "I am ready to initalialise the database" message with a button for admins (so the bot can join the server and run without already doing stuff)
- /seasontip (currently no idea what his is even gonna be)
    - instead of registration have to do the season tips?
    - send dm with season tips
- /help (need to automate the creation of this) (might not need this if I automate/buttonise almsot every command)



### some cleaner code perhaps?

- add more try/catch?
- change all funcs/vars to snake_case (to distinguish from discord.js functions)



### big maybies:

- create all matches at the start (how would this work when Phase 2 is not yet determined?)
    - no need to include team names in /announcement (and people cannot fuck it up)
    - liber can vote on unannounced matches (nevermind this is so stupid on so many levels)
- make bot usage stats (how many peopel have dm settings active, how often have peopel voted through dms vs public, etc.)
- people can tip with a command like before?
- bot can remind people of matches
    -> make a 'user' class and a 'reminder' class. The Intervall goes through all reminders and dm's the respective people. the user gets a field where they can fill in the hours/minutes.
- automatically receive results from the website and end the matches
    -> add teams to config
- add odds to the point distribution?
- write a function, that replaces all Role-Mentions with Role-Name (for archiving)
- add a daily minigame, where "the ball carrier" can choose how to cap the pole and the first three people to react can choose where to shoot.
    - if the carrier caps, he gets the point, the first one to shoot him, gets the ball
- add buttons to dm_settings where people can have all their tips be sent or all currently open announcements (in case they change their mind on not having dms on)



### known bugs:

- re-announcing an ended match should remove people's points
- rescheduling/reannouncing matches should come with a warning (and probably mantion if a match is already ended)

- scheduling a match outside of short-notice, but then rescheduling into short_notice "breaks" short-notice checks
    -> check "createdAt" in reschedule-codeBlock
        -> delete existing tips
            -> look for deleted tips when rescheduled out of short_notice again
                -> make SpeedTipsBot tip even on short_notice matches, but delete its tip

- matches can be scheduled with any Role
    - this would be solved by pre-creating the matches before league start
    - alternatively add teams to config

- /submitresult buttons get posted with 4-0 pre-pressed somehow?
- /submitresult button presses say "interaction failed" for no good reason
- captains can submit results to any match (instead of only their own)
    - these three would be solved with auto-results

- in dms cannot distinguish ended matches that you have voted correctly vs not at all



### commented OUT for development:

- intervall length
- short-notice length (in /schedulematch)
- .pin()

### commented IN for development:

- allowedMentions in /schedulematch new match and reannoucnement (announcement_channel.send)
