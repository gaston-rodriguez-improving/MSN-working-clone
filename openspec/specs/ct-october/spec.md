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
The system SHALL finish a started session only when the submitted code matches `Y2K_PATCH_CODE`, ignoring letter case, spaces, and dashes.

#### Scenario: Correct code
- **GIVEN** a started session that is not finished
- **WHEN** the team submits the configured code
- **THEN** the finish time is stored
- **AND** the elapsed time is the finish time minus the start time

#### Scenario: Wrong code
- **GIVEN** a started session
- **WHEN** the team submits a different code
- **THEN** the session stays unfinished

#### Scenario: Past 60 minutes
- **GIVEN** a session that started more than 60 minutes ago and is not finished
- **WHEN** the team submits the configured code
- **THEN** the session finishes
- **AND** the elapsed time is longer than 60 minutes

#### Scenario: Already finished
- **GIVEN** a finished session
- **WHEN** the team submits the configured code again
- **THEN** the stored finish time stays the same

#### Scenario: Reset team
- **GIVEN** a team whose session was reset
- **WHEN** the team submits the configured code
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
