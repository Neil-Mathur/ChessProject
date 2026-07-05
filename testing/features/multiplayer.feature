Feature: Online multiplayer
  As a player
  I want to create or join an online game room
  So that I can play against another person in real time

  Background:
    Given the NEXT_PUBLIC_MULTIPLAYER flag is set to "true"

  Scenario: Lobby page redirects to home when multiplayer is disabled
    Given the NEXT_PUBLIC_MULTIPLAYER flag is not set to "true"
    When I navigate directly to "/lobby"
    Then I should be redirected to the home page "/"

  Scenario: Create a game room
    Given I am on the "/lobby" page
    When I select a variant and click "Create game (play as White)"
    Then I should be redirected to a "/play/<roomId>" page
    And I should see a room code displayed on the page
    And the status should indicate I am waiting for an opponent

  Scenario: Join a game room with a valid code
    Given player A has created a room with code "ABC123"
    When I enter "ABC123" into the room code field
    And I click "Join game (play as Black)"
    Then I should be redirected to "/play/ABC123"
    And the game should begin with White to move

  Scenario: Join a game room with an invalid code shows an error
    When I enter "XXXXXX" into the room code field
    And I click "Join game (play as Black)"
    Then I should see an error message indicating the room was not found
    And I should remain on the "/lobby" page

  Scenario: Join button is disabled until a room code is entered
    Given the room code input is empty
    Then the "Join game" button should be disabled

  Scenario: Moves made by White are reflected on Black's board
    Given player A (White) and player B (Black) are in the same room
    When White plays e4
    Then Black's board should show the pawn on e4
    And the status on Black's screen should show "Black to move"

  Scenario: Moves are validated server-side
    Given it is White's turn
    When White attempts to make an illegal move
    Then the move should be rejected
    And the board should not change

  Scenario: A player cannot move on the opponent's turn
    Given it is White's turn
    Then the Black pieces should not be interactive for the Black player
    And the White player should not be able to move Black's pieces

  Scenario: Reconnect to an ongoing game after disconnect
    Given player A is in a game room and their browser disconnects
    When player A reopens the same room URL within 5 minutes
    Then they should rejoin as the same colour
    And the game state should be restored

  Scenario: Resign ends the game
    Given both players are in an active game
    When White clicks "Resign"
    Then the game should end with Black as the winner
    And both players should see the result on screen

  Scenario: Lobby shows variant selection before creating a game
    Given I am on the "/lobby" page
    Then I should see a variant selector with Standard Chess, Monster King Chess, and Crazyhouse
    When I select "Crazyhouse" and create a game
    Then the game room should use the Crazyhouse rule set
