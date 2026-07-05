Feature: Settings page — board and piece skins
  As a player
  I want to customise the board and piece appearance
  So that I can personalise my playing experience

  Background:
    Given I am on the "/settings" page

  Scenario Outline: Change board skin and see it on the board
    When I select "<theme_name>" from the "Board skin" dropdown
    And I navigate to the home page
    Then the board should use the "<theme_name>" colour scheme

    Examples:
      | theme_name       |
      | Tournament Green |
      | Ocean Blue       |
      | Walnut           |
      | Slate            |
      | Rosewood         |

  Scenario Outline: Change piece skin and see it on the board
    When I select "<piece_set>" from the "Piece skin" dropdown
    And I navigate to the home page
    Then the pieces should be rendered using the "<piece_set>" style

    Examples:
      | piece_set       |
      | Classic (SVG)   |
      | Unicode Glyphs  |

  Scenario: Board skin change persists after page refresh
    When I select "Walnut" from the "Board skin" dropdown
    And I refresh the page
    Then the "Board skin" dropdown should still show "Walnut"

  Scenario: Piece skin change persists after page refresh
    When I select "Unicode Glyphs" from the "Piece skin" dropdown
    And I refresh the page
    Then the "Piece skin" dropdown should still show "Unicode Glyphs"

  Scenario: Board skin change persists when navigating away and back
    When I select "Rosewood" from the "Board skin" dropdown
    And I click "Home" in the sidebar
    And I click "Settings" in the sidebar
    Then the "Board skin" dropdown should still show "Rosewood"

  Scenario: Settings apply to the board immediately after navigating to the home page
    When I select "Ocean Blue" from the "Board skin" dropdown
    And I navigate to the home page
    Then the board should use blue light and dark squares

  Scenario: Settings are preserved when signed in (DB sync)
    Given I am signed in with Google
    When I select "Slate" from the "Board skin" dropdown
    And I sign out
    And I sign back in
    Then the "Board skin" preference should still be "Slate"
