let userRatings = {};

document.addEventListener('DOMContentLoaded', function() {
    initGenreRecommender();

    document.getElementById('recommender-by-genre').addEventListener('click', function() {
        initGenreRecommender();
    });

    document.getElementById('recommender-by-rating').addEventListener('click', function() {
        fetch('http://127.0.0.1:5000/movies')
            .then(response => response.json())
            .then(movies => {
                displayMovies(movies);
            });
    });
});

function displayMovies(movies) {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="container mt-4">
            <div class="row">
                <div class="col">
                    <h2>Step 1: Rate As Many Movies as Possible</h2>
                </div>
            </div>
            <div id="movies-list" class="row"></div>
        </div>
        <div class="container mt-4">
            <div class="row">
                <div class="col">
                    <h2>Step 2: Get Personalized Movie Recommendations</h2>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <button id="rating-get-recommendations" class="btn btn-primary">Click Here for Personalized Recommendations</button>
                </div>
            </div>
        </div>
    `;

    const moviesListDiv = document.getElementById('movies-list');
    movies.forEach(movie => {
        const movieDiv = document.createElement('div');
        movieDiv.className = 'col-md-3 col-sm-6 mb-4';
        movieDiv.innerHTML = `
            <div class="card">
                <img src="https://liangfgithub.github.io/MovieImages/${movie.MovieID}.jpg?raw=true" 
                     alt="${movie.Title}" 
                     class="card-img-top" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Placeholder+Image';">
                <div class="card-body">
                    <h5 class="card-title">${movie.Title}</h5>
                    <div class="rating">${generateStarsHtml(movie.MovieID)}</div>
                </div>
            </div>
        `;
        moviesListDiv.appendChild(movieDiv);
    });


    document.getElementById('rating-get-recommendations').addEventListener('click', function() {
        let fullRatings = {};
        for (let i = 1; i <= 3706; i++) { // Assuming 3706 is the total number of movies
            fullRatings['m' + i] = userRatings[i] ? userRatings[i] : NaN;
        }
    
        fetch('http://127.0.0.1:5000/user_recommendations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fullRatings),
        })
        .then(response => response.json())
        .then(data => {
            displayRecommendations(data);
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
        });
    });
    
    function displayRecommendations(recommendations) {
        const resultsContainer = document.getElementById('recommendation-results');
        resultsContainer.innerHTML = '';
        
        recommendations.forEach(movie => {
            const movieDiv = document.createElement('div');
            movieDiv.className = 'movie col-md-4 mb-4'; // Adjust the class names as per your CSS
            movieDiv.innerHTML = `
                <div class="card">
                    <img src="${movie.image_url}" alt="${movie.title}" class="card-img-top">
                    <div class="card-body">
                        <h5 class="card-title">${movie.title}</h5>
                    </div>
                </div>
            `;
            resultsContainer.appendChild(movieDiv);
        });
    }    
    
}

function generateStarsHtml(movieId) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        starsHtml += `<span class="star" data-movie-id="${movieId}" data-rating="${i}">&#9733;</span>`;
    }
    return starsHtml;
}

document.addEventListener('click', function(event) {
    if (event.target.classList.contains('star')) {
        const movieId = event.target.dataset.movieId;
        const rating = parseInt(event.target.dataset.rating, 10);
        rateMovie(movieId, rating);
    }
});

function rateMovie(movieId, rating) {
    userRatings[movieId] = rating;
    updateStarVisuals(movieId, rating);
}

function updateStarVisuals(movieId, rating) {
    const stars = document.querySelectorAll(`.movie[data-movie-id="${movieId}"] .star`);
    stars.forEach((star, index) => {
        star.style.color = index < rating ? 'gold' : 'grey';
    });
}

// DONT TOUCH THIS: 
function initGenreRecommender() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="genre-selector my-4">
            <form>
                <div class="form-group">
                    <label for="genre-select" class="custom-label">Select your Favorite Genre</label>
                    <select id="genre-select" class="form-control">
                        <!-- Genre options will be populated here -->
                    </select>
                </div>
                <button type="button" id="get-recommendations" class="btn btn-primary">Get Recommendations</button>
            </form>
            <div id="recommendations-results" class="mt-4">
                <!-- Recommendations will be inserted here -->
            </div>
        </div>
    `;

    const genreSelect = document.getElementById('genre-select');
    const genres = [
        'Action', 'Adventure', 'Animation', 'Children\'s', 'Comedy', 'Crime',
        'Documentary', 'Drama', 'Fantasy', 'Film-Noir', 'Horror', 'Musical',
        'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
    ];

    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
    });

    document.getElementById('get-recommendations').addEventListener('click', getRecommendations);
}

function getRecommendations() {
    const selectedGenre = document.getElementById('genre-select').value;
    
    fetch(`http://127.0.0.1:5000/recommendations?genre=${encodeURIComponent(selectedGenre)}`)
        .then(response => response.json())
        .then(data => {
            const resultsContainer = document.getElementById('recommendations-results');
            resultsContainer.innerHTML = '';

            // Check if the response is an array (has movies) or an object (has a message)
            if (Array.isArray(data)) {
                // Handle movie recommendations
                data.forEach(movie => {
                    const movieElement = document.createElement('p');
                    movieElement.textContent = `${movie.Title} - Rating: ${movie.average_rating}`;
                    resultsContainer.appendChild(movieElement);
                });
            } else if (data.message) {
                // Handle case with no recommendations
                const messageElement = document.createElement('p');
                messageElement.textContent = data.message;
                resultsContainer.appendChild(messageElement);
            }
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
        });
}

