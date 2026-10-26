# ct-october Specification

## Purpose
Stores one timed Y2K session per office team, checks the patch code, and gives an office admin the team list, the board, and a reset.

## Requirements

### Requirement: Each office starts with ten teams
The system SHALL keep Argentina and Chile separate, and SHALL create Team 1 through Team 10 for an office when that office has no teams for the current company and event.

#### Scenario: First boot
- **GIVEN** an office with no teams
- **WHEN** the API starts
- **THEN** that office has ten teams named Team 1 through Team 10
- **AND** each team has a keyword
- **AND** the other office is unchanged

#### Scenario: Keywords already edited
- **GIVEN** an office that already has teams
- **WHEN** the API starts again
- **THEN** those names and keywords are not replaced

### Requirement: A team has one session
The system SHALL start a session once per team and SHALL resume it for a later login with the same keyword.

#### Scenario: Start
- **GIVEN** a team that has not started
- **WHEN** the crew submits that team's keyword and starts
- **THEN** the session start time is recorded
- **AND** a team token is returned

#### Scenario: Wrong keyword
- **GIVEN** a team
- **WHEN** the crew submits a different keyword
- **THEN** no session starts and no token is returned

#### Scenario: Resume
- **GIVEN** a team whose session already started
- **WHEN** another crew member submits the same keyword and starts
- **THEN** the original start time is kept

#### Scenario: Team list stays private
- **GIVEN** someone who is not an admin
- **WHEN** they request the teams for an office
- **THEN** the response includes names and not keywords

### Requirement: The server accepts the patch code
The system SHALL finish a started session only when the submitted code matches the patch code stored for the team's own office, ignoring letter case, spaces, and dashes.

#### Scenario: Correct code
- **GIVEN** a started session that is not finished
- **WHEN** the team submits its office's stored code
- **THEN** the finish time is stored
- **AND** the elapsed time is the finish time minus the start time

#### Scenario: Wrong code
- **GIVEN** a started session
- **WHEN** the team submits a different code
- **THEN** the session stays unfinished

#### Scenario: The other office's code
- **GIVEN** Argentina and Chile with different codes and a started Argentina team
- **WHEN** the team submits Chile's code
- **THEN** the session stays unfinished

#### Scenario: Past 60 minutes
- **GIVEN** a session that started more than 60 minutes ago and is not finished
- **WHEN** the team submits its office's stored code
- **THEN** the session finishes
- **AND** the elapsed time is longer than 60 minutes

#### Scenario: Already finished
- **GIVEN** a finished session
- **WHEN** the team submits its office's stored code again
- **THEN** the stored finish time stays the same

#### Scenario: Reset team
- **GIVEN** a team whose session was reset
- **WHEN** the team submits its office's stored code
- **THEN** the session does not finish
- **AND** the response tells the client the team was reset

### Requirement: An admin manages one office
The system SHALL admit an admin only with that office's password, and SHALL limit every later admin action to that office.

#### Scenario: Office password
- **GIVEN** the Argentina admin password
- **WHEN** it is submitted for Argentina
- **THEN** an admin token for Argentina is returned

#### Scenario: Wrong office
- **GIVEN** the Argentina admin password
- **WHEN** it is submitted for Chile
- **THEN** no token is returned

#### Scenario: Create, edit, and delete
- **GIVEN** an admin token for one office
- **WHEN** the admin creates a team, changes its name and keyword, then deletes it
- **THEN** only that office's teams change

#### Scenario: Other office is hidden
- **GIVEN** an admin token for Argentina
- **WHEN** the admin reads the board
- **THEN** Chile teams are not included

### Requirement: The board and the reset
The system SHALL report each team's status and elapsed time, SHALL rank finished teams by shortest elapsed time, and SHALL clear session times only for the admin's office.

#### Scenario: Status
- **GIVEN** one team that has not started, one that is running, and one that has finished
- **WHEN** the admin reads the board
- **THEN** each team shows that status
- **AND** the running and finished teams show how long they have been in the session

#### Scenario: Podium
- **GIVEN** two finished teams
- **WHEN** the admin reads the podium
- **THEN** the team with the shorter elapsed time is first

#### Scenario: Restart one team
- **GIVEN** one finished team and one finished or running teammate in the same office
- **WHEN** the admin restarts the first team
- **THEN** only that team's session times are cleared

#### Scenario: Reset while people are playing
- **GIVEN** at least one team that has started and not finished
- **WHEN** the admin resets the office
- **THEN** every session time for that office is cleared
- **AND** the team names and keywords remain

#### Scenario: Reset of a quiet office
- **GIVEN** no team is currently running
- **WHEN** the admin resets the office
- **THEN** the session times are cleared
- **AND** the response says that nobody was running

### Requirement: Each office has an initial patch code
The system SHALL give each office a stored patch code on first start, taken from `Y2K_PATCH_CODE` or `Y2KPATCH99` when that variable is unset, and SHALL never overwrite an existing stored code with that value.

#### Scenario: First start
- **GIVEN** no stored code for an office
- **WHEN** the API starts
- **THEN** the office has a stored code equal to the environment value or `Y2KPATCH99`
- **AND** it is marked as the default code

#### Scenario: Later start
- **GIVEN** an office whose admin saved its own code
- **WHEN** the API starts again, even with a different `Y2K_PATCH_CODE`
- **THEN** the stored code is unchanged

#### Scenario: Missing row
- **GIVEN** an office whose stored code row is missing
- **WHEN** an admin reads the code or a team submits one
- **THEN** the row is created from the initial value and the request continues

### Requirement: An admin sets only their office's patch code
The system SHALL let an admin read and replace the patch code of the office in the admin token, and nobody else.

#### Scenario: Read
- **GIVEN** an admin token for Argentina
- **WHEN** the admin reads the patch code
- **THEN** the response has the Argentina code, whether it is still the default, and when it was last changed
- **AND** it has no Chile data

#### Scenario: Save
- **GIVEN** an admin token for Argentina
- **WHEN** the admin saves a valid new code
- **THEN** the Argentina code changes
- **AND** the Chile code does not change

#### Scenario: Same code in both offices
- **GIVEN** both admins save the same valid code
- **WHEN** each office's team submits it
- **THEN** each team can finish

#### Scenario: No admin token
- **GIVEN** a request with no token, a team token, or a messenger token
- **WHEN** it reads or saves the patch code
- **THEN** the response is 401 and nothing changes

#### Scenario: Company and event isolation
- **GIVEN** an admin token for another company or event
- **WHEN** it reads or saves the patch code
- **THEN** the response is 401 and the stored code is not touched

### Requirement: A saved code must be valid
The system SHALL accept a new code only when, ignoring case, spaces, and dashes, it has 4 to 32 letters or numbers, and its raw text has only letters, numbers, spaces, and dashes and at most 48 characters.

#### Scenario: Valid code
- **GIVEN** an admin token
- **WHEN** the admin saves `Y2K-fix 2025`
- **THEN** the saved code is shown as typed
- **AND** a team that submits `y2kfix2025` can finish

#### Scenario: Empty code
- **GIVEN** an admin token
- **WHEN** the admin saves an empty code
- **THEN** the response is 400 with the message `Enter a code` and the stored code is unchanged

#### Scenario: Too short or too long
- **GIVEN** an admin token
- **WHEN** the admin saves a code with 3 characters, or one with 33 letters or numbers
- **THEN** the response is 400 with the message `Use 4 to 32 letters or numbers`

#### Scenario: Unsupported characters
- **GIVEN** an admin token
- **WHEN** the admin saves a code with symbols such as `!` or `#`
- **THEN** the response is 400 with the message `Use only letters, numbers, spaces and dashes`

### Requirement: The initial code stops working after the office sets its own
The system SHALL stop accepting the initial default code for an office once that office's admin has saved a code, and SHALL refuse to save the default code as the new one.

#### Scenario: Default retired
- **GIVEN** an office still on `Y2KPATCH99`
- **WHEN** its admin saves a different valid code
- **THEN** a started team submitting `Y2KPATCH99` does not finish
- **AND** the same team submitting the new code finishes

#### Scenario: Default can not be saved again
- **GIVEN** an office with its own code
- **WHEN** the admin saves `Y2KPATCH99`, or the current `Y2K_PATCH_CODE`
- **THEN** the response is 400 with the message `Choose a code different from the default`

#### Scenario: Other office unaffected
- **GIVEN** Argentina saved its own code and Chile did not
- **WHEN** a Chile team submits `Y2KPATCH99`
- **THEN** the Chile team can finish

### Requirement: A change applies at the next submission
The system SHALL apply a saved code to the next submission of every running team, and SHALL NOT change teams that already finished.

#### Scenario: Running team
- **GIVEN** a running team that was given the old code
- **WHEN** the admin saves a new code and the team submits the old one
- **THEN** the team does not finish

#### Scenario: Finished team
- **GIVEN** a team that already finished
- **WHEN** the admin saves a new code
- **THEN** the team's finish time and status are unchanged

### Requirement: The code is not exposed to teams
The system SHALL return the patch code only to the admin read route, and SHALL NOT log it.

#### Scenario: Team responses
- **GIVEN** a team logged in
- **WHEN** it reads its session, the public team list, or submits a wrong code
- **THEN** no response contains the stored code
