Feature: Authentication and preference sync
  As a returning player
  I want to sign in with Google
  So that my preferences are saved and restored across devices

  Background:
    Given I am on the "MadChessLab" website

  Scenario: Sign in button is visible when signed out
    Given I am not signed in
    Then I should see a "Sign in" button at the bottom of the sidebar

  Scenario: Sign in with Google redirects to Google OAuth
    Given I am not signed in
    When I click "Sign in"
    Then I should be redirected to the Google sign-in page

  Scenario: After sign in, user name or avatar is shown
    Given I have signed in with Google
    Then the "Sign in" button should be replaced with the user's name or avatar
    And I should see a "Sign out" option

  Scenario: Preferences are loaded from the database after sign in
    Given I have previously saved the board skin "Walnut" while signed in
    And I am currently signed out with local preference "Tournament Green"
    When I sign in with Google
    Then the board skin should change to "Walnut"
    And the board should reflect the "Walnut" theme

  Scenario: Preferences are seeded to the database on first sign in
    Given I have never signed in before
    And my local board skin preference is "Ocean Blue"
    When I sign in with Google
    Then the database should store "Ocean Blue" as my board skin

  Scenario: Preference changes while signed in are saved to the database
    Given I am signed in
    When I navigate to Settings and select "Rosewood" as the board skin
    Then within a second the preference should be saved to the database
    And after signing out and back in the board skin should still be "Rosewood"

  Scenario: Sign out falls back to localStorage preferences
    Given I am signed in with board skin "Slate" stored in the database
    And my local storage has board skin "Tournament Green"
    When I sign out
    Then the board skin should revert to "Tournament Green"

  Scenario: Signed-out user preferences are saved in localStorage only
    Given I am not signed in
    When I select "Walnut" as the board skin on the Settings page
    And I refresh the page
    Then the board skin should still be "Walnut"
    And no API call to "/api/preferences" should have been made
