const natural = require('natural');
const spearman = require('spearmans-rank-correlation');

// Assuming you have preprocessed your data and it's now in a list of strings
let data = ["movie1", "movie2", "movie3", ...];

// Vectorize the data
let TfIdf = natural.TfIdf;
let tfidf = new TfIdf();

data.forEach((item) => {
    tfidf.addDocument(item);
});

// Jaccard similarity function
function jaccard_similarity(list1, list2) {
    let intersection = list1.filter(value => list2.includes(value)).length;
    let union = list1.length + list2.length - intersection;
    return intersection / union;
}

// Assuming you have preprocessed your data and it's now in a list of lists
data = [["movie1", "movie2", "movie3"], ["movie2", "movie3", "movie4"], ...];

// Calculate Jaccard similarity and Spearman rank correlation for each pair of users
let similarity_scores = [];
for (let i = 0; i < data.length; i++) {
    let user_scores = [];
    for (let j = 0; j < data.length; j++) {
        let jaccard = jaccard_similarity(data[i], data[j]);
        let correlation = spearman(data[i], data[j]);
        let average_score = (jaccard + correlation) / 2;
        user_scores.push(average_score);
    }
    similarity_scores.push(user_scores);
}

// Now you can use these similarity scores to see how similar different movies are to each other
