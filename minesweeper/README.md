# Minesweeper (Windows 7 Style)

A premium, web-based Minesweeper clone inspired by the classic Windows 7 Aero aesthetic.

## Features

*   **Classic Gameplay**: Hard mode configuration (30x16 grid, 99 mines).
*   **Windows 7 Aero Style**: Authentic blue gradients, glossy cells, and classic number colors.
*   **Themes**:
    *   **Light Mode**: Classic Windows 7 Blue.
    *   **Dark Mode**: A modern, premium dark theme with neon accents.
*   **Advanced Controls**:
    *   **Left Click**: Reveal cell.
    *   **Right Click**: Toggle flag.
    *   **Middle Click** or **Left+Right Click**: Chord (reveal surrounding cells if flags match).
*   **Animations**: Smooth hover effects, click depressions, and a satisfying chain-reaction explosion on game over.
*   **Accessibility**: UI Scale slider to adjust the game size (defaults to large 1.8x).
*   **Safety**: First click is guaranteed to be safe.

## How to Play

1.  Open `index.html` in your web browser.
2.  **Objective**: Clear the board without detonating any mines.
3.  **Numbers**: Indicate how many mines are adjacent to that square.
4.  **Flagging**: Right-click a square you suspect is a mine.
5.  **Chording**: If a number has the correct amount of flags around it, click it with the Middle Mouse Button (or hold Left+Right) to clear all other neighbors instantly.

## Deployment

This project includes a GitHub Action to automatically deploy to GitHub Pages on every push to the `main` branch.
