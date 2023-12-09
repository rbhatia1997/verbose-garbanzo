from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import math

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# Load recommendations from the JSON file
with open('recommendations.json') as file:
    # Parsing the outer JSON structure
    recommendations_data = json.load(file)

def parse_genre_data(genre_data):
    # Splitting the string into individual movie JSONs and parsing each one
    return [json.loads(movie_json) for movie_json in genre_data.strip().split('\n') if movie_json]

def get_system_1_recommendations(genre):
    # Check if the genre exists in the data
    if genre in recommendations_data and recommendations_data[genre].strip():
        # Parse the genre data
        genre_recommendations = parse_genre_data(recommendations_data[genre])

        # Round the ratings and format the response
        formatted_recommendations = [{
            'Title': rec['Title'],
            'average_rating': round(rec['average_rating'], 2),
            'rating_count': int(rec['rating_count'])
        } for rec in genre_recommendations]

        return formatted_recommendations
    else:
        # Return a message if there are no recommendations for the genre
        return {"message": f"No recommendations available for genre: {genre}. It may have insufficent ratings."}
    
# ======= START OF SYSTEM 2 IMPLEMENTATION ==============

ratings = pd.read_csv('ratings.dat', sep='::', engine = 'python', header=None)
ratings.columns = ['UserID', 'MovieID', 'Rating', 'Timestamp']
movies = pd.read_csv('movies.dat', sep='::', engine = 'python',
                     encoding="ISO-8859-1", header = None)
movies.columns = ['MovieID', 'Title', 'Genres']

r = pd.read_csv('rmatrix.csv')
rmeans = np.mean(r, axis=1)
rmeans_arr = np.array(rmeans.values.tolist())

r_norm = r - np.repeat(rmeans_arr[:,None], r.shape[1], axis=1)
n = r_norm.shape[1] # number of movies

# Load the similarity matrix
S = pd.read_csv("top_similarity_matrix.csv").set_index("Unnamed: 0")

def myIBCF(w): # newuser should be a 3706-by-1 vector denoted as w
    preds = np.zeros(n)
    w_nonNA = ~np.isnan(w) * 1
    for l in range(n):
        indices = np.where(~np.isnan(S.iloc[l,:]))[0] # get the 30 nearest neighbors' indices # find the indices from this boolean array
        sum_nonNA = 0
        sum_w = 0
        for i in indices:
            if not(math.isnan(w[i])): # to avoid the case where the user didn't rate the movie at i
                sum_nonNA += S.iloc[l, i] * w_nonNA[i]
                sum_w += S.iloc[l, i] * w[i]
        if sum_nonNA == 0: # to avoid divde by zero errors
            preds[l] = 0
        else:
            preds[l] = (1 / sum_nonNA ) * sum_w
    mov_indices = preds.argsort()[-10:][::-1] # return only the top 10 movies
    # for i in mov_indices:
    #     print(f'{r.columns[i]}: {preds[i]}')
    # print(preds[mov_indices])
    return r.columns[mov_indices].tolist()

@app.route('/movies', methods=['GET'])
def get_movies():
    # Read the movies.dat file
    movies_df = pd.read_csv('movies.dat', sep='::', engine='python', header=None, encoding='ISO-8859-1')
    movies_df.columns = ['MovieID', 'Title', 'Genres']
    
    # Send the list of movies as JSON
    movies_list = movies_df[['MovieID', 'Title']].to_dict(orient='records')
    return jsonify(movies_list)

@app.route('/user_recommendations', methods=['POST'])
def user_recommendations():
    user_ratings = request.json  # Expecting a dictionary of {movie_id: rating}

    # Convert to the format expected by myIBCF
    user_ratings_series = pd.Series(user_ratings)

    # Replace 'NaN' strings with np.nan
    user_ratings_series = user_ratings_series.replace('NaN', np.nan).astype(float)

    # Call myIBCF function with the ratings
    recommendations = myIBCF(user_ratings_series)

    # Convert movie IDs to titles and images
    movie_details = []
    for movie_id in recommendations:
        # Extract numerical ID from the format 'm{MovieID}'
        numeric_id = int(movie_id[1:])
        movie = movies[movies['MovieID'] == numeric_id]

        if not movie.empty:
            movie_info = {
                'id': numeric_id,
                'title': movie.iloc[0]['Title'],
                'image_url': f"https://liangfgithub.github.io/MovieImages/{numeric_id}.jpg?raw=true"
            }
            movie_details.append(movie_info)

    return jsonify(movie_details)

# ======= END OF SYSTEM 2 IMPLEMENTATION ==============

@app.route('/recommendations', methods=['GET'])
def recommendations():
    genre = request.args.get('genre', default='Action', type=str)
    recommendations = get_system_1_recommendations(genre)
    return jsonify(recommendations)

if __name__ == '__main__':
    app.run(debug=True)
