function getVector(direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
}

function buildTraversals(grid, vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < grid.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }
  
    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();
  
    return traversals;
}

function findFarthestPosition(grid, cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
      previous = cell;
      cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (grid.withinBounds(cell) &&
             grid.cellAvailable(cell));
  
    return {
      farthest: previous,
      next: cell // Used to check if a merge is required
    };
}

function prepareTiles(grid) {
    grid.eachCell(function (x, y, tile) {
        if (tile) {
          tile.mergedFrom = null;
          tile.savePosition();
        }
    });
}

function addRandomTile(grid) {
    if (grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(grid.randomAvailableCell(), value);
    
        grid.insertTile(tile);
    }
}

function addTile(grid, pos, value) {
    let tile = new Tile(pos, value)
    grid.insertTile(tile)
}

function moveTile(grid, tile, cell) {
    grid.cells[tile.x][tile.y] = null;
    grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
}

function positionsEqual(first, second) {
    return first.x === second.x && first.y === second.y;
}

function tileMatchesAvailable(grid) {
    var tile;
  
    for (var x = 0; x < grid.size; x++) {
      for (var y = 0; y < grid.size; y++) {
        tile = grid.cellContent({ x: x, y: y });
  
        if (tile) {
          for (var direction = 0; direction < 4; direction++) {
            var vector = getVector(direction);
            var cell   = { x: x + vector.x, y: y + vector.y };
  
            var other  = grid.cellContent(cell);
  
            if (other && other.value === tile.value) {
              return true; // These two tiles can be merged
            }
          }
        }
      }
    }
  
    return false;
}

function movesAvailable(grid) {
    return grid.cellsAvailable() || tileMatchesAvailable(grid);
}

function rateGrid(grid) {
  let pointsFactor = [[0, -0.3, -0.6, -1],
                      [0.3, 0, 0, -0.6],
                      [0.6, 0, 0, -0.3],
                      [1, 0.6, 0.3, 0]]

  let moves = [0,1,2,3]

  let points = 0

  let cells = grid.serialize().cells
  for (let x = 0; x < pointsFactor.length; x++) {
    for (let y = 0; y < pointsFactor[x].length; y++) {
        let v = cells[x][y] ? cells[x][y].value : 0
        points += pointsFactor[x][y] * v 
        points += v

        if (v == 0) points += 8

        for (let m of moves) {
            let vector = getVector(m)
            let farthest = findFarthestPosition(grid, { x, y }, vector)
            let nextCell = grid.cellContent(farthest.next)

            if (nextCell && nextCell.value == v) points += v
        }
    }
  }

  return points
}

function simMove(grid, direction) {
      // 0: up, 1: right, 2: down, 3: left
  var cell, tile;

  var vector     = getVector(direction);
  var traversals = buildTraversals(grid, vector);
  var moved      = false;
  // Save the current tile positions and remove merger information
  prepareTiles(grid);

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = grid.cellContent(cell);

      if (tile) {
        var positions = findFarthestPosition(grid, cell, vector);
        var next      = grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          grid.insertTile(merged);
          grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

        } else {
          moveTile(grid, tile, positions.farthest);
        }

        if (!positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (!moved) return -100000;

  return rateGrid(grid);
}

function maxPoints(grid, depth=1) {
    if (depth == 0) {
        return 0
    }

    let moves = [0,1,2,3]

    let max = 0
    let initialGrid = new Grid(grid.size, grid.serialize().cells)

    for (let m of moves) {
        let points = simMove(grid, m) 
        let availableCells = grid.availableCells()

        if (availableCells.length > 0) {
            let cellChance = 1 / availableCells.length

            for (let cell of availableCells) {
                let gridCopy = new Grid(grid.size, grid.serialize().cells)

                addTile(gridCopy, cell, 2)
                points += 0.9 * cellChance * maxPoints(gridCopy, depth - 1)

                gridCopy = new Grid(grid.size, grid.serialize().cells)

                addTile(gridCopy, cell, 4)
                points += 0.1 * cellChance * maxPoints(gridCopy, depth - 1)
            }
        }
        

        if (points > max) max = points

        grid = new Grid(initialGrid.size, initialGrid.serialize().cells)
    }

    return max
}


function bestMove(grid, depth=1) {
    let moves = [0,1,2,3]
    let bestMove = 0
    let bestPoints = -100000
    let initialGrid = new Grid(grid.size, grid.serialize().cells)

    for (let move of moves) {
        let points = simMove(grid, move)
        let availableCells = grid.availableCells()

        if (availableCells.length > 0) {
            let cellChance = 1 / availableCells.length

            for (let cell of availableCells) {
                let gridCopy = new Grid(grid.size, grid.serialize().cells)

                addTile(gridCopy, cell, 2)
                points += 0.9 * cellChance * maxPoints(gridCopy, depth - 1)

                gridCopy = new Grid(grid.size, grid.serialize().cells)

                addTile(gridCopy, cell, 4)
                points += 0.1 * cellChance * maxPoints(gridCopy, depth - 1)
            }
        }

        if (points > bestPoints) {
            bestPoints = points
            bestMove = move
        }

        grid = new Grid(initialGrid.size, initialGrid.serialize().cells)
    }

    return bestMove
}