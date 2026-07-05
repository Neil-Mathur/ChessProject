Feature: Chess gameplay
  As a player
  I want to play chess moves on the board
  So that I can enjoy a game of chess

  Background:
    Given I am on the home page
    And both White and Black are set to Human
    And the variant is "Standard Chess"

  Scenario: Select a piece and see valid move highlights
    When I click on the white pawn at e2
    Then the pawn at e2 should appear selected
    And the squares e3 and e4 should be highlighted as valid moves

  Scenario: Move a piece to a valid square
    When I click on the white pawn at e2
    And I click on e4
    Then the pawn should move to e4
    And the status should show "Black to move"
    And the move log should contain "e4"

  Scenario: Click an invalid square deselects the piece
    When I click on the white pawn at e2
    And I click on e5
    Then no move should be made
    And the selection should be cleared

  Scenario: New game resets the board
    Given several moves have been made
    When I click "New game"
    Then the board should return to the starting position
    And the move log should be empty
    And the status should show "White to move"

  Scenario: Undo removes the last move
    Given the moves e4 and e5 have been played
    When I click "Undo"
    Then the black pawn should return to e7
    And the status should show "Black to move"
    And the move log should contain only "e4"

  Scenario: Undo does nothing on an empty move log
    Given no moves have been made
    When I click "Undo"
    Then the board position should be unchanged
    And the status should show "White to move"

  Scenario: Flip board changes orientation
    When I click "Flip"
    Then black pieces should appear at the bottom of the board
    And white pieces should appear at the top of the board
    When I click "Flip" again
    Then white pieces should appear at the bottom again

  Scenario: Checkmate ends the game
    Given the board is set up for Scholar's mate
    When the final mating move is played
    Then the status should show "White wins"
    And no further moves should be possible

  Scenario: Stalemate results in a draw
    Given the board is set up for stalemate
    When the stalemating move is played
    Then the status should show "Draw — stalemate"

  Scenario: Crazyhouse — captured piece goes to pocket
    Given the variant is "Crazyhouse"
    And White has captured a black pawn
    When I view the captured pieces panel
    Then White's pocket should contain one pawn

  Scenario: Crazyhouse — drop a captured piece
    Given the variant is "Crazyhouse"
    And White has a captured pawn in their pocket
    When I select the pawn from White's pocket
    And I click on empty square d4
    Then a white pawn should appear on d4
    And White's pocket should be empty

  Scenario: Monster King Chess — black moves twice per turn
    Given the variant is "Monster King Chess"
    When White makes a move
    Then the status should show "Black to move"
    When Black makes their first move
    Then the status should show "Black to move — 1 move left"
    When Black makes their second move
    Then the status should show "White to move"
