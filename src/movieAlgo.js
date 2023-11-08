const movieListsLike = [
  [
    'Aliens',
    'The Departed',
    'Fight Club',
    'Titanic',
    'Toy Story',
    'Gladiator',
    'Casablanca',
    'Pulp Fiction',
    'Jurassic Park',
    'Django Unchained',
    'Interstellar',
    'The Matrix',
    'Se7en',
    'Avengers: Endgame',
    'The Terminator',
    'The Dark Knight',
    'Goodfellas',
    'The Godfather',
    'The Empire Strikes Back',
  ],
  [
    'The Prestige',
    'Interstellar',
    'Django Unchained',
    'The Terminator',
    'Jurassic Park',
    'Pulp Fiction',
    'The Lion King',
    'Casablanca',
    'Gladiator',
    'Forrest Gump',
    'The Empire Strikes Back',
    'The Dark Knight',
    'Rocky',
    'The Matrix',
    'The Wolf of Wall Street',
    'Braveheart',
    'Toy Story',
    'Titanic',
    'Fight Club',
  ],
  [
    'Whiplash',
    'The Departed',
    'The Lion King',
    'The Terminator',
    'The Empire Strikes Back',
    'Jurassic Park',
    'Avengers: Endgame',
    'Forrest Gump',
    'The Dark Knight',
    'Pulp Fiction',
    'Rocky',
    'The Wolf of Wall Street',
    'Django Unchained',
  ],
  ['Pulp Fiction', 'The Matrix', 'Fight Club', 'Inception'],
  ['Inception', 'Fight Club', 'The Matrix', 'Pulp Fiction'],
  ['Pulp Fiction', 'The Matrix', 'Fight Club'],
  ['Pulp Fiction', 'The Godfather', 'The Matrix', 'Fight Club', 'Inception'],
];
const movieListsDislike = [
  [
    'Lord of the Rings: The Fellowship of the Ring',
    'Shawshank Redemption',
    'Forrest Gump',
    "Schindler's List",
    'The Dark Knight',
    'Braveheart',
    'The Godfather',
    'The Matrix',
  ],
  [
    'Dead Poets Society',
    'The Terminator',
    'Gladiator',
    'The Empire Strikes Back',
    'Saving Private Ryan',
    'Inception',
    'The Dark Knight Rises',
    'Avengers: Infinity War',
  ],
  [
    'The Departed',
    'The Lion King',
    'Jurassic Park',
    'Fight Club',
    'Good Will Hunting',
    'The Prestige',
    'A Beautiful Mind',
    'American History X',
    'Spider-Man: Into the Spider-Verse',
  ],
  [
    'The Sixth Sense',
    'Catch Me If You Can',
    'The Green Mile',
    'Aliens',
    'Iron Man',
    'Wonder Woman',
    'Black Panther',
    'Toy Story',
    'Django Unchained',
  ],
  [
    'The Hangover',
    'Zombieland',
    'The Wolf of Wall Street',
    'The Avengers',
    'The Godfather',
    'The Shining',
    'Casablanca',
    'Harry Potter and the Prisoner of Azkaban',
    'Mad Max: Fury Road',
  ],
  [
    'Inglourious Basterds',
    'Joker',
    'Interstellar',
    'Se7en',
    "Harry Potter and the Sorcerer's Stone",
    'Pulp Fiction',
    'The Revenant',
    'Guardians of the Galaxy',
    'Kill Bill: Vol. 1',
  ],
  [
    'The Big Lebowski',
    'No Country for Old Men',
    'Titanic',
    'The Godfather Part II',
    'The Breakfast Club',
    'E.T. the Extra-Terrestrial',
    'Goodfellas',
    'The Social Network',
    'The Matrix',
  ],
];
// -------------------------------------------------------------

function compareLists(
  listA,
  listB,
  existenceWeight = 0.8,
  positionWeight = 0.2,
) {
  let totalExistenceScore = 0;
  let totalPositionScore = 0;

  for (let i = 0; i < listA.length; i++) {
    const movie = listA[i];
    const indexInListB = listB.indexOf(movie);

    if (indexInListB !== -1) {
      totalExistenceScore += 1;

      const normalizedPosA = i / (listA.length - 1);
      const normalizedPosB = indexInListB / (listB.length - 1);

      const positionScore = 1 - Math.abs(normalizedPosA - normalizedPosB);
      totalPositionScore += positionScore;
    }
  }

  const maxScore = Math.min(listA.length, listB.length);
  const normalizedExistenceScore = totalExistenceScore / maxScore;
  const normalizedPositionScore = totalPositionScore / maxScore;

  const totalScore =
    normalizedExistenceScore * existenceWeight +
    normalizedPositionScore * positionWeight;

  return totalScore * 100;
}

// Compute the similarity matrix
const similarityMatrixLike = Array.from({ length: movieListsLike.length }, () =>
  Array(movieListsLike.length).fill(0),
);

for (let i = 0; i < movieListsLike.length; i++) {
  for (let j = 0; j < movieListsLike.length; j++) {
    similarityMatrixLike[i][j] = compareLists(
      movieListsLike[i],
      movieListsLike[j],
    ).toFixed(2);
  }
}
const similarityMatrixDislike = Array.from(
  { length: movieListsDislike.length },
  () => Array(movieListsDislike.length).fill(0),
);

for (let i = 0; i < movieListsDislike.length; i++) {
  for (let j = 0; j < movieListsDislike.length; j++) {
    similarityMatrixDislike[i][j] = compareLists(
      movieListsDislike[i],
      movieListsDislike[j],
    ).toFixed(2);
  }
}

function avgMatrices(matrixA, matrixB) {
  // Check if matrices have the same dimensions
  if (
    matrixA.length !== matrixB.length ||
    matrixA[0].length !== matrixB[0].length
  ) {
    throw new Error('Matrices must have the same dimensions');
  }

  // Create a new matrix to store the results
  let resultMatrix = [];

  // Iterate through the rows
  for (let i = 0; i < matrixA.length; i++) {
    // Create a new row for the result matrix
    let row = [];

    // Iterate through the columns
    for (let j = 0; j < matrixA[i].length; j++) {
      // Subtract the corresponding elements and store in the new matrix
      row.push((parseFloat(matrixA[i][j]) + parseFloat(matrixB[i][j])) / 2);
    }

    // Add the row to the result matrix
    resultMatrix.push(row);
  }

  return resultMatrix;
}

const similarityMatrix = avgMatrices(
  similarityMatrixLike,
  similarityMatrixDislike,
);

//console.log(movieLists)
// Output the similarity matrix
console.table(similarityMatrix);

function suggestMoviesForList(
  targetListIndex,
  similarityMatrix,
  movieListsLike,
  movieListsDislike,
  similarityCutoff,
) {
  let movieScores = {};
  similarityCutoff += 1;
  // Create an array of similarity scores along with indices
  let similarityScores = similarityMatrix[targetListIndex].map(
    (score, index) => ({
      score: parseFloat(score),
      index,
    }),
  );

  // Sort the similarity scores in descending order
  similarityScores.sort((a, b) => b.score - a.score);

  // Take the top similarity scores as per the similarityCutoff
  similarityScores = similarityScores.slice(0, similarityCutoff);
  //console.log(similarityScores)

  // Iterate through the top similarity scores
  for (let { score, index } of similarityScores) {
    // Skip the target list
    if (index === targetListIndex) continue;

    // Loop through movies in the current list
    for (let j = 0; j < movieListsLike[index].length; j++) {
      let movie = movieListsLike[index][j];
      let totalMovies = movieListsLike[index].length;
      let normalizedRank = 1 - (j + 1) / totalMovies; // Normalizing rank between 0 and 1

      if (
        movieListsLike[targetListIndex].indexOf(movie) === -1 &&
        movieListsDislike[targetListIndex].indexOf(movie) === -1
      ) {
        // If movie is not in target list
        if (!movieScores[movie]) {
          movieScores[movie] = 0;
        }
        // Consider normalized rank while calculating score
        movieScores[movie] += score * normalizedRank;
      }
    }
    for (let j = 0; j < movieListsDislike[index].length; j++) {
      let movie = movieListsDislike[index][j];
      let totalMovies = movieListsDislike[index].length;
      let normalizedRank = 1 - (j + 1) / totalMovies; // Normalizing rank between 0 and 1

      if (
        movieListsLike[targetListIndex].indexOf(movie) === -1 &&
        movieListsDislike[targetListIndex].indexOf(movie) === -1
      ) {
        // If movie is not in target list
        if (!movieScores[movie]) {
          movieScores[movie] = 0;
        }
        // Consider normalized rank while calculating score
        movieScores[movie] -= score * normalizedRank;
      }
    }
  }

  // Convert to an array and sort by scores
  let suggestedMovies = Object.keys(movieScores).map((movie) => [
    movie,
    movieScores[movie],
  ]);
  suggestedMovies.sort((a, b) => b[1] - a[1]);

  return suggestedMovies;
}

const suggestions = suggestMoviesForList(
  2,
  similarityMatrix,
  movieListsLike,
  movieListsDislike,
  4,
);
console.log(suggestions);
