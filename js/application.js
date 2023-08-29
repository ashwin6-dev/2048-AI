// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  let GM = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);


  setInterval(() => {
    if (GM.over) return;
    let grid = new Grid(GM.grid.size, GM.grid.serialize().cells)
    let move = bestMove(grid, 3)
    GM.move(move)
  }, 1)
});
