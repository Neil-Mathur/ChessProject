Feature: Chess variant selection
  As a player
  I want to select different chess variants
  So that I can play different rule sets

  Background:
    Given I am on the home page

  Scenario Outline: Select a variant and see its name above the board
    When I select the variant "<variant_name>" from the variant dropdown
    Then the heading above the board should display "<variant_name>"
    And the description below the heading should describe the variant rules

    Examples:
      | variant_name        |
      | Standard Chess      |
      | Monster King Chess  |
      | Crazyhouse          |

  Scenario: Selecting a variant starts a new game
    Given I am playing a Standard Chess game with several moves made
    When I select "Crazyhouse" from the variant dropdown
    Then the board should reset to the starting position
    And the move log should be empty
    And the status should show "White to move"

  Scenario: Variant selection persists after page refresh
    When I select "Monster King Chess" from the variant dropdown
    And I refresh the page
    Then the variant dropdown should still show "Monster King Chess"
    And the heading above the board should display "Monster King Chess"

  Scenario: Standard Chess starts with correct piece layout
    When I select "Standard Chess" from the variant dropdown
    Then white pieces should occupy ranks 1 and 2
    And black pieces should occupy ranks 7 and 8
    And all 32 pieces should be on the board

  Scenario: Monster King Chess starts with asymmetric layout
    When I select "Monster King Chess" from the variant dropdown
    Then black should have only a king and three pawns
    And the status should indicate white moves first

  Scenario: Crazyhouse starts with empty pockets
    When I select "Crazyhouse" from the variant dropdown
    Then both captured piece pockets should be empty
    And standard starting position should be displayed
