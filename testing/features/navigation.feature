Feature: Site-wide navigation
  As a user
  I want to navigate between pages using the left sidebar
  So that I can access all areas of the site without getting lost

  Background:
    Given I am on the "MadChessLab" website

  Scenario: Banner is visible on every page
    When I visit the home page
    Then I should see the banner image at the top of the page
    And the sidebar navigation should be displayed below the banner

  Scenario: Sidebar is visible on all pages
    When I visit the home page
    Then I should see the left sidebar
    When I click "About" in the sidebar
    Then I should be on the "/about" page
    And I should see the left sidebar

  Scenario: Active link is highlighted
    When I visit the home page
    Then the "Home" link in the sidebar should be highlighted as active
    When I click "About" in the sidebar
    Then the "About" link should be highlighted as active
    And the "Home" link should not be highlighted

  Scenario: Navigate to Settings page
    When I click "Settings" in the sidebar
    Then I should be on the "/settings" page
    And I should see "Board skin" and "Piece skin" options

  Scenario: Navigate to About page
    When I click "About" in the sidebar
    Then I should see the heading "About MadChessLab"
    And I should see descriptions of Standard Chess, Monster King Chess, and Crazyhouse

  Scenario: Play Online link hidden when multiplayer is disabled
    Given the NEXT_PUBLIC_MULTIPLAYER flag is not set to "true"
    When I visit any page
    Then I should not see a "Play Online" link in the sidebar

  Scenario: Play Online link visible when multiplayer is enabled
    Given the NEXT_PUBLIC_MULTIPLAYER flag is set to "true"
    When I visit the home page
    Then I should see a "Play Online" link in the sidebar

  Scenario: Toggle between local and online play
    Given the NEXT_PUBLIC_MULTIPLAYER flag is set to "true"
    When I click "Play Online" in the sidebar
    Then I should be on the "/lobby" page
    And I should see a "Play Local" link in the sidebar instead of "Play Online"
    When I click "Play Local" in the sidebar
    Then I should be on the home page
