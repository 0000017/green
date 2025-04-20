// Echoes of Random Patterns 

// Echoes of patterns shifting between order and randomness,
// revealing unseen rhythms and unexpected harmonies. 
// By Jawhar Kodadi // 091124 // https://jawharkodadi.com

// Paramètres pour ajuster les propriétés du dessin
let settings = {
  cols: 5,                     // Nombre de colonnes de motifs
  rows: 5,                     // Nombre de lignes de motifs
  colorFillProbability: 0.5,   // Probabilité qu'un carré soit coloré
  stepNum: 10,                 // Nombre de subdivisions dans chaque motif
  paletteIndex: 0,             // Index de la palette de couleurs sélectionnée
  hatchProbability: 0.2,       // Probabilité qu'une case soit remplie avec des hachures
  horizontalHatchProbability: 0.5, // Probabilité que les hachures soient horizontales
  handDrawnIntensity: 1,       // Intensité de l'effet de dessin à main levée
  circlePatternProbability: 0.3, // Probabilité d'ajouter un motif de cercles
  wavyLinePatternProbability: 0.3, // Probabilité d'ajouter un motif de lignes ondulées
  polkaDotPatternProbability: 0.3, // Probabilité d'ajouter un motif de pois
  backgroundGradientStart: '#ffffff', // Couleur de départ du gradient de fond
  backgroundGradientEnd: '#e0e0e0',   // Couleur de fin du gradient de fond

  // Fonction de randomisation des paramètres
  randomize: function() {
    settings.cols = floor(random(1, 10));
    settings.rows = floor(random(1, 10));
    settings.colorFillProbability = random(0, 1);
    settings.stepNum = floor(random(3, 20));
    settings.paletteIndex = floor(random(0, palettes.length));
    settings.hatchProbability = random(0, 1);
    settings.horizontalHatchProbability = random(0, 1);
    settings.handDrawnIntensity = random(0, 3);
    settings.circlePatternProbability = random(0, 1);
    settings.wavyLinePatternProbability = random(0, 1);
    settings.polkaDotPatternProbability = random(0, 1);
    settings.backgroundGradientStart = randomColor();
    settings.backgroundGradientEnd = randomColor();
    redrawCanvas(); 
  }
};

// Palettes de couleurs
const palettes = [
  ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"], // Palette originale
  ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"], // Niveaux de gris
  ["#ff6b6b", "#E8A615", "#BBC40A", "#4DDD15", "#1dd1a1", "#1210D9", "#B923D2"], // Palette pastel harmonieuse
  ["#53C53F", "#77FF08", "#D125F7", "#5F13A5", "#09B765"], // Palette vive harmonieuse
  ["#054272", "#0E771F", "#C47416", "#0E34D2", "#f2f2f2"]  // Palette contrastée harmonieuse
];

function setup() {
  createCanvas(windowWidth, windowHeight); 
  noLoop(); 
  setupGUI(); 
  redrawCanvas();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); 
  redrawCanvas(); 
}

function setupGUI() {
  let gui = new dat.GUI();

  // Sliders pour les paramètres principaux
  gui.add(settings, 'cols', 1, 10, 1).name('Colonnes').onChange(redrawCanvas);
  gui.add(settings, 'rows', 1, 10, 1).name('Lignes').onChange(redrawCanvas);
  gui.add(settings, 'colorFillProbability', 0, 1, 0.01).name('Probabilité de couleur').onChange(redrawCanvas);
  gui.add(settings, 'stepNum', 3, 20, 1).name('Nombre de pas').onChange(redrawCanvas);
  gui.add(settings, 'hatchProbability', 0, 1, 0.01).name('Probabilité de hachures').onChange(redrawCanvas);
  gui.add(settings, 'horizontalHatchProbability', 0, 1, 0.01).name('Probabilité hachures horizontales').onChange(redrawCanvas);
  gui.add(settings, 'handDrawnIntensity', 0, 3, 0.1).name('Intensité dessin main levée').onChange(redrawCanvas);

  // Sliders pour les motifs
  gui.add(settings, 'circlePatternProbability', 0, 1, 0.01).name('Probabilité motif cercles').onChange(redrawCanvas);
  gui.add(settings, 'wavyLinePatternProbability', 0, 1, 0.01).name('Probabilité motif lignes ondulées').onChange(redrawCanvas);
  gui.add(settings, 'polkaDotPatternProbability', 0, 1, 0.01).name('Probabilité motif pois').onChange(redrawCanvas);

  // Choix de la palette via un menu déroulant
  gui.add(settings, 'paletteIndex', { "Originale": 0, "Niveaux de gris": 1, "Pastel": 2, "Vibrante": 3, "Contraste": 4 })
    .name('Palette de couleurs')
    .onChange(redrawCanvas);

  // Bouton Randomize
  gui.add(settings, 'randomize').name('Randomiser');
}

function redrawCanvas() {
  // Dessiner le gradient de fond
  drawBackgroundGradient();

  // Calcul de la taille de chaque motif en fonction du nombre de colonnes et de lignes
  const cellSizeX = (width * 0.8) / settings.cols; //  80% de la largeur du canvas
  const cellSizeY = (height * 0.8) / settings.rows; // 80% de la hauteur du canvas
  const size = min(cellSizeX, cellSizeY);

  // Calcul des marges pour centrer la grille dans le canvas
  const offsetX = (width - settings.cols * size) / 2;
  const offsetY = (height - settings.rows * size) / 2;

  for (let j = 0; j < settings.rows; j++) {
    for (let i = 0; i < settings.cols; i++) {
      const x = offsetX + i * size;
      const y = offsetY + j * size;
      drawRectangles(x, y, size, i, j);
    }
  }
}

function drawBackgroundGradient() {
  let gradient = drawingContext.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, settings.backgroundGradientStart);
  gradient.addColorStop(1, settings.backgroundGradientEnd);
  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(0, 0, width, height);
}

function drawRectangles(x, y, size, colIndex, rowIndex) {
  const step_num = settings.stepNum;
  const step = size / step_num;

  push();
  translate(x, y);
  const cells = Array.from({ length: step_num }, () => Array.from({ length: step_num }, () => false));

  // Générer une couleur basée sur la position dans la grille
  const colors = palettes[settings.paletteIndex]; // Sélection de la palette
  const baseColorIndex = int(map(colIndex, 0, settings.cols - 1, 0, colors.length - 1));
  const baseColor = color(colors[baseColorIndex]);

  for (let j = 0; j < step_num; j++) {
    for (let i = 0; i < step_num; i++) {
      let cellSizeMax = int(random(1, step_num / 2));
      for (let cellSize = cellSizeMax; cellSize > 0; cellSize--) {
        let isAlready = false;
        for (let l = j; l < j + cellSize; l++) {
          for (let k = i; k < i + cellSize; k++) {
            let l_ = constrain(l, 0, step_num - 1);
            let k_ = constrain(k, 0, step_num - 1);
            if (cells[l_][k_]) {
              isAlready = true;
            }
          }
        }
        if (!isAlready) {
          let wc = step * cellSize;
          let hc = step * cellSize;
          let rectX = step * i;
          let rectY = step * j;
          if (rectX + wc > size) {
            wc = size - rectX;
          }
          if (rectY + hc > size) {
            hc = size - rectY;
          }

          if (random(1) < settings.hatchProbability) {
            const isHorizontal = random(1) < settings.horizontalHatchProbability;
            const spacing = random(3, 10); // Espacement aléatoire pour les hachures
            drawHatch(rectX, rectY, wc, hc, spacing, isHorizontal); // Remplir avec des hachures
          } else if (random(1) < settings.colorFillProbability) {
            // Utiliser la couleur basée sur la position
            let c = color(baseColor);
            fill(c);
            noStroke();
            handDrawnRect(rectX, rectY, wc, hc);
          } else {
            noFill();
          }

          // Dessiner des motifs internes en fonction des probabilités
          let patternDrawn = false;
          if (random(1) < settings.circlePatternProbability) {
            drawCirclePattern(rectX, rectY, wc, hc, colors);
            patternDrawn = true;
          } 
          if (!patternDrawn && random(1) < settings.wavyLinePatternProbability) {
            drawWavyLinePattern(rectX, rectY, wc, hc, colors);
            patternDrawn = true;
          }
          if (!patternDrawn && random(1) < settings.polkaDotPatternProbability) {
            drawPolkaDotPattern(rectX, rectY, wc, hc, colors);
          }

          stroke(0);
          strokeWeight(random(0.5, 2)); // Variation de l'épaisseur des lignes
          handDrawnRect(rectX, rectY, wc, hc);

          for (let l = j; l < j + cellSize; l++) {
            for (let k = i; k < i + cellSize; k++) {
              let l_ = constrain(l, 0, step_num - 1);
              let k_ = constrain(k, 0, step_num - 1);
              cells[l_][k_] = true;
            }
          }
        }
      }
    }
  }
  pop();
}

function drawHatch(x, y, w, h, spacing, isHorizontal) {
  stroke(0);
  strokeWeight(random(0.5, 1.5)); // Variation de l'épaisseur des lignes

  if (isHorizontal) {
    // Lignes horizontales pour remplir la cellule
    for (let i = 0; i <= h; i += spacing) {
      let y1 = y + i + random(-settings.handDrawnIntensity, settings.handDrawnIntensity);
      let y2 = y + i + random(-settings.handDrawnIntensity, settings.handDrawnIntensity);
      line(
        x + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
        y1,
        x + w + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
        y2
      );
    }
  } else {
    // Lignes verticales pour remplir la cellule
    for (let i = 0; i <= w; i += spacing) {
      let x1 = x + i + random(-settings.handDrawnIntensity, settings.handDrawnIntensity);
      let x2 = x + i + random(-settings.handDrawnIntensity, settings.handDrawnIntensity);
      line(
        x1,
        y + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
        x2,
        y + h + random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
      );
    }
  }
}

function handDrawnRect(x, y, w, h) {
  beginShape();
  vertex(
    x + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
    y + random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
  );
  vertex(
    x + w + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
    y + random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
  );
  vertex(
    x + w + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
    y + h + random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
  );
  vertex(
    x + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
    y + h + random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
  );
  endShape(CLOSE);
}

function drawCirclePattern(x, y, w, h, colors) {
  const colorIndex = int(random(colors.length));
  stroke(colors[colorIndex]);
  noFill();
  strokeWeight(random(0.5, 1.5));

  let maxRadius = min(w, h) / 2;
  let numCircles = int(random(3, 7));
  for (let i = 0; i < numCircles; i++) {
    let radius = (maxRadius / numCircles) * (i + 1);
    ellipse(
      x + w / 2 + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
      y + h / 2 + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
      radius * 2,
      radius * 2
    );
  }
}

function drawWavyLinePattern(x, y, w, h, colors) {
  const colorIndex = int(random(colors.length));
  stroke(colors[colorIndex]);
  noFill();
  strokeWeight(random(0.5, 1.5));

  let numLines = int(random(5, 10));
  for (let i = 0; i < numLines; i++) {
    beginShape();
    let amplitude = random(2, 5);
    let frequency = random(1, 3);
    for (let xi = x - w * 0.1; xi <= x + w * 1.1; xi += w / 20) {
      let progress = map(xi, x, x + w, 0, 1);
      let yi = y + (h / numLines) * i + sin(progress * TWO_PI * frequency) * amplitude;
      curveVertex(
        xi + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
        yi + random(-settings.handDrawnIntensity, settings.handDrawnIntensity)
      );
    }
    endShape();
  }
}

function drawPolkaDotPattern(x, y, w, h, colors) {
  const colorIndex = int(random(colors.length));
  fill(colors[colorIndex]);
  noStroke();

  let numDotsX = int(random(3, 6));
  let numDotsY = int(random(3, 6));
  let dotSize = min(w, h) / max(numDotsX, numDotsY) * 0.5;

  for (let i = 0; i < numDotsX; i++) {
    for (let j = 0; j < numDotsY; j++) {
      let dx = x + (w / numDotsX) * i + (w / numDotsX) / 2;
      let dy = y + (h / numDotsY) * j + (h / numDotsY) / 2;
      ellipse(
        dx + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
        dy + random(-settings.handDrawnIntensity, settings.handDrawnIntensity),
        dotSize,
        dotSize
      );
    }
  }
}

function randomColor() {
  return '#' + floor(random(0x1000000)).toString(16).padStart(6, '0');
}

function mouseReleased() {
  redrawCanvas();
}