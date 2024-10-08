// SETUP BEGINS
const express = require("express");
const cors = require("cors");
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt')
const MongoClient = require("mongodb").MongoClient;
const dbname = "recipe-book";
const jwt = require('jsonwebtoken');

// enable dotenv (allow Express application to read .env files)
require('dotenv').config();

// set the mongoUri to be MONGO_URI from .env
const mongoUri = process.env.MONGO_URI;

// Create a Log In Route Lab 8 Part 2 Step 3
const generateAccessToken = (id, email) => {
    return jwt.sign({
        'user_id': id,
        'email': email
    }, process.env.TOKEN_SECRET, {
        expiresIn: "1h" // h for hour, d for days, m is for minutes
    });
}

// Lab 8 Part 2 Step 4 Protect Routes with Middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(403);
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

 //app.get('/protected-route', verifyToken, (req, res) => {
    // Route handler code here
 //  });

 
  
  

// 1a. create the app
let app = express();

// 1b. enable JSON Processing
// !! Enable processing JSON data
app.use(express.json());

// !! Enable CORS
app.use(cors());

async function connect(uri, dbname) {
    let client = await MongoClient.connect(uri, {
        useUnifiedTopology: true
    })
    _db = client.db(dbname);
    return _db;
}

// SETUP END
async function main() {

  // let db = await connect(mongoUri, dbname);
const db = await connect(mongoUri, dbname);

  // Routes
  app.get('/', function (req,res){
    res.json({
    "message":"Hello World!"
   });
});


app.get('/recipes', async (req, res) => {
    try {
        const { tags, cuisine, ingredients, name } = req.query;
        let query = {};

        if (tags) {
            query['tags.name'] = { $in: tags.split(',') };
        }

        if (cuisine) {
            query['cuisine.name'] = { $regex: cuisine, $options: 'i' };
        }

        if (ingredients) {
            query['ingredients.name'] = { $all: ingredients.split(',').map(i => new RegExp(i, 'i')) };
        }

        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }

        const recipes = await db.collection('recipes').find(query).project({
            name: 1,
            'cuisine.name': 1,
            'tags.name': 1,
            _id: 0
        }).toArray();

        res.json({ recipes });
    } catch (error) {
        console.error('Error searching recipes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//create
app.get("/recipes/:id", async (req, res) => {
    try {
        const id = req.params.id;
        
        // First, fetch the recipe
        const recipe = await db.collection("recipes").findOne(
            { _id: new ObjectId(id) },
            { projection: { _id: 0 } }
        );
        
        if (!recipe) {
            return res.status(404).json({ error: "Recipe not found" });
        }
       
        res.json(recipe);
    } catch (error) {
        console.error("Error fetching recipe:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Lab 4 Step 2, Add a POST /recipes route
app.post('/recipes', async (req, res) => {
    try {
        const { name, cuisine, prepTime, cookTime, servings, ingredients, instructions, tags } = req.body;

        // Basic validation
        if (!name || !cuisine || !ingredients || !instructions || !tags) {
            return res.status(400).json({'error': 'Missing required fields' });
        }

        // Fetch the cuisine document
        const cuisineDoc = await db.collection('cuisines').findOne({ name: cuisine });
        if (!cuisineDoc) {
            return res.status(400).json({ error: 'Invalid cuisine' });
        }

        // Fetch the tag documents
        const tagDocs = await db.collection('tags').find({ name: { $in: tags } }).toArray();
        if (tagDocs.length !== tags.length) {
            return res.status(400).json({ error: 'One or more invalid tags' });
        }

        // Create the new recipe object
        const newRecipe = {
            name,
            cuisine: {
                _id: cuisineDoc._id,
                name: cuisineDoc.name
            },
            prepTime,
            cookTime,
            servings,
            ingredients,
            instructions,
            tags: tagDocs.map(tag => ({
                _id: tag._id,
                name: tag.name
            }))
        };

        // Insert the new recipe into the database
        const result = await db.collection('recipes').insertOne(newRecipe);

        // Send back the created recipe
        res.status(201).json({
            message: 'Recipe created successfully',
            recipeId: result.insertedId
        });
    } catch (error) {
        console.error('Error creating recipe:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a Put Route for recipes Lab 5 Step 1
app.put('/recipes/:id', async (req, res) => {
    try {
        const recipeId = req.params.id;
        const { name, cuisine, prepTime, cookTime, servings, ingredients, instructions, tags } = req.body;

        // Basic validation
        if (!name || !cuisine || !ingredients || !instructions || !tags) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Fetch the cuisine document
        const cuisineDoc = await db.collection('cuisines').findOne({ name: cuisine });
        // if (!cuisineDoc) {
        //     return res.status(400).json({ error: 'Invalid cuisine' });
        // }

        // Fetch the tag documents
        const tagDocs = await db.collection('tags').find({ name: { $in: tags } }).toArray();
        if (tagDocs.length !== tags.length) {
            return res.status(400).json({ error: 'One or more invalid tags' });
        }

        // Create the updated recipe object
        const updatedRecipe = {
            name,
            cuisine: {
                _id: cuisineDoc._id,
                name: cuisineDoc.name
            },
            prepTime,
            cookTime,
            servings,
            ingredients,
            instructions,
            tags: tagDocs.map(tag => ({
                _id: tag._id,
                name: tag.name
            }))
        };

        // Update the recipe in the database
        const result = await db.collection('recipes').updateOne(
            { _id: new ObjectId(recipeId) },
            { $set: updatedRecipe }
        );

        if (result.matchedCount == 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        // Send back the success response
        res.json({
            message: 'Recipe updated successfully'
        });
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add A Route to delete recipes Lab 6 Step 1
app.delete('/recipes/:id', async (req, res) => {
    try {
        const recipeId = req.params.id;

        // Attempt to delete the recipe
        const result = await db.collection('recipes').deleteOne({ _id: new ObjectId(recipeId) });

        if (result.deletedCount == 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



  // Add Post for Reviews Lab 7 Step 1
  app.post('/recipes/:id/reviews', async (req, res) => {
    try {
        const recipeId = req.params.id;
        const { user, rating, comment } = req.body;

        // Basic validation
        if (!user || !rating || !comment) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create the new review object
        const newReview = {
            review_id: new ObjectId(),
            user,
            rating: Number(rating),
            comment,
            date: new Date()
        };

        // Add the review to the recipe
        const result = await db.collection('recipes').updateOne(
            { _id: new ObjectId(recipeId) },
            { $push: { reviews: newReview } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        res.status(201).json({
            message: 'Review added successfully',
            reviewId: newReview.review_id
        });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a Specific Review in a Recipe Lab 7 Step 4
app.put('/recipes/:recipeId/reviews/:reviewId', async (req, res) => {
    try {
        const recipeId = req.params.recipeId;
        const reviewId = req.params.reviewId;
        const { user, rating, comment } = req.body;

        // Basic validation
        if (!user || !rating || !comment) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create the updated review object
        const updatedReview = {
            review_id: new ObjectId(reviewId),
            user,
            rating: Number(rating),
            comment,
            date: new Date()  // Update the date to reflect the edit time
        };

        // Update the specific review in the recipe document
        const result = await db.collection('recipes').updateOne(
            { 
                _id: new ObjectId(recipeId),
                "reviews.review_id": new ObjectId(reviewId)
            },
            { 
                $set: { "reviews.$": updatedReview }
            }
        );

        if (result.matchedCount == 0) {
            return res.status(404).json({ error: 'Recipe or review not found' });
        }

        res.json({
            message: 'Review updated successfully',
            reviewId: reviewId
        });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a Review Route Lab 7 Step 6
app.delete('/recipes/:recipeId/reviews/:reviewId', async (req, res) => {
    try {
        const recipeId = req.params.recipeId;
        const reviewId = req.params.reviewId;

        // Remove the specific review from the recipe document
        const result = await db.collection('recipes').updateOne(
            { _id: new ObjectId(recipeId) },
            { 
                $pull: { 
                    reviews: { review_id: new ObjectId(reviewId) }
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }

        res.json({
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Creating a sign-up Road Lab 8 Part 1 Step 1
app.post('/users', async function (req, res) {
    const result = await db.collection("users").insertOne({
        'email': req.body.email,
        'password': await bcrypt.hash(req.body.password, 12)
    })
    res.json({
        "message": "New user account",
        "result": result
    })
  })


app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const user = await db.collection('users').findOne({ email: email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }
  const accessToken = generateAccessToken(user._id, user.email);
  res.json({ accessToken: accessToken });
});

app.get('/profile', verifyToken, (req, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
  });

  

}

main();

// START SERVER
app.listen(3001, () => {
  console.log("Server has started");
});
