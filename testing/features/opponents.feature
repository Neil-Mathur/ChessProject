Feature: Opponent configuration
  As a player
  I want to configure human vs computer opponents
  So that I can play solo, with a friend, or watch the AI play itself

  Background:
    Given I am on the home page
    And the variant is "Standard Chess"

  Scenario: Default setup has both sides as Human
    Then the White opponent dropdown should show "Human"
    And the Black opponent dropdown should show "Human"

  Scenario: Set White to Computer — AI plays automatically
    When I expand the "Opponents" panel
    And I set "White" to "Computer"
    And I click "New game"
    Then the computer should make a move for White automatically
    And the status should show "Black to move" after the AI moves

  Scenario: Set Black to Computer — AI responds after human move
    When I expand the "Opponents" panel
    And I set "Black" to "Computer"
    When White plays e4
    Then the computer should automatically respond for Black
    And the status should show "White to move" after the AI moves

  Scenario: Both sides Computer — game plays itself
    When I expand the "Opponents" panel
    And I set "White" to "Computer"
    And I set "Black" to "Computer"
    And I click "New game"
    Then the game should proceed automatically without any user moves
    And the move log should accumulate moves

  Scenario: Status shows "Computer is thinking" during AI turn
    Given Black is set to "Computer"
    When White plays e4
    Then the status should briefly show "Computer is thinking…"
    And then update to "White to move" once the AI responds

  Scenario Outline: AI difficulty levels affect search depth
    When I expand the "Opponents" panel
    And I set "Black" to "Computer"
    And I set "Difficulty" to "<level>"
    Then the AI should use a search depth of <depth> plies

    Examples:
      | level  | depth |
      | Easy   | 2     |
      | Medium | 3     |
      | Hard   | 4     |

  Scenario: Opponent settings persist after page refresh
    When I expand the "Opponents" panel
    And I set "White" to "Computer"
    And I set "Difficulty" to "Hard"
    And I refresh the page
    Then the "White" opponent should still be "Computer"
    And the "Difficulty" should still be "Hard"
