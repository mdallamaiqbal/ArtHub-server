require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
const uri = process.env.MONGO_DB_URI;
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    
    const database = client.db("art_hub_db");
    const artCollection = database.collection("arts");
    const userCollection = database.collection("user");
    const commentsCollection = database.collection("comments");
    app.post('/api/arts' , async(req,res)=>{
        const art = req.body;
        const result = await artCollection.insertOne(art);
        res.send(result)
    })
  app.post('/api/comments', async (req, res) => {
  try {
    const { artId, artistId, userEmail, userName, userImage, text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).send({ message: "Comment text cannot be empty" });
    }

    const newComment = {
      artId,
      artistId,
      userEmail,
      userName,
      userImage,
      text,
      createdAt: new Date()
    };

    const result = await commentsCollection.insertOne(newComment);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
    app.get('/api/all-arts', async (req, res) => {
  const artsWithArtistInfo = await artCollection.aggregate([
    {
      $lookup: {
        from: "user",
        let: { artist_id: "$artistId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", { $toObjectId: "$$artist_id" }]
              }
            }
          }
        ],
        as: "artistDetails"
      }
    },
    {
      $unwind: {
        path: "$artistDetails",
        preserveNullAndEmptyArrays: true 
      }
    },
    {
      $project: {
        title: 1,
        description: 1,
        price: 1,
        category: 1,
        imageUrl: 1,
        artistId: 1,
        artistName: "$artistDetails.name",
        artistImage: "$artistDetails.image"
      }
    }
  ]).toArray();

  res.send(artsWithArtistInfo);
   });

   app.get('/api/all-arts/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const result = await artCollection.aggregate([
      {
        $match: {
          _id: new ObjectId(id)
        }
      },
      {
        $lookup: {
          from: "user",
          let: { artist_id: "$artistId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", { $toObjectId: "$$artist_id" }]
                }
              }
            }
          ],
          as: "artistDetails"
        }
      },
      {
        $unwind: {
          path: "$artistDetails",
          preserveNullAndEmptyArrays: true 
        }
      },
      {
        $project: {
          title: 1,
          description: 1,
          price: 1,
          category: 1,
          imageUrl: 1,
          artistId: 1,
          artistName: "$artistDetails.name",
          artistImage: "$artistDetails.image"
        }
      }
    ]).toArray();

    if (result.length > 0) {
      res.send(result[0]);
    } else {
      res.status(404).send({ message: "Artwork not found" });
    }

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
   });

   app.get('/api/my-arts', async (req, res) => {
     const artistId = req.query.artistId; 

  if (!artistId) {
     return res.status(400).send({ message: "Artist ID parameter is required" });
  } 
   const query = { artistId: artistId };
      
      
  const result = await artCollection.find(query).toArray();
  res.send(result);
   });

  app.get('/api/arts/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }; 
    const result = await artCollection.findOne(query); 
    res.send(result);
  });

  app.get('/api/users', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }
  const query = { email: email };
  const result = await userCollection.findOne(query);
  res.send(result);
  });

  app.get('/api/comments/:artId', async (req, res) => {
  try {
    const artId = req.params.artId;
    const comments = await commentsCollection
      .find({ artId: artId })
      .sort({ createdAt: -1 })
      .toArray();
    res.send(comments);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
 });

   app.delete('/api/arts/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }; 
    const result = await artCollection.deleteOne(query);
    res.send(result);
  });

  app.delete('/api/comments/:id', async (req, res) => {
  try {
    const commentId = req.params.id;
    const { userEmail, loggedInArtistId } = req.body; 
    const comment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });

    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }
    const isCommentOwner = comment.userEmail === userEmail;
    const isArtOwner = comment.artistId === loggedInArtistId;

    if (!isCommentOwner && !isArtOwner) {
      return res.status(403).send({ 
        message: "Forbidden: Only the comment poster or the art creator can delete this comment" 
      });
    }

    const result = await commentsCollection.deleteOne({ _id: new ObjectId(commentId) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

   app.patch('/api/users/update-profile', async (req, res) => {
  const { currentEmail, email, name, image } = req.body;

  if (!currentEmail) {
    return res.status(400).send({ message: "Current email is required to identify the user" });
  }
  const filter = { email: currentEmail }; 
  const updateDoc = {
    $set: {
      name: name,
      email: email, 
      image: image,
      updatedAt: new Date() 
    }
  };
 
  try {
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal server error" });
  }
  });

   app.put('/api/arts/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) }; 
    const updatedArt = req.body; 
    
    const updateDoc = {
        $set: {
            title: updatedArt.title,
            description: updatedArt.description,
            price: parseFloat(updatedArt.price), 
            category: updatedArt.category,
            imageUrl: updatedArt.imageUrl
        },
    };   
    const result = await artCollection.updateOne(filter, updateDoc);
    res.send(result); 
  });

  app.put('/api/comments/:id', async (req, res) => {
  try {
    const commentId = req.params.id;
    const { text, userEmail } = req.body;
    const comment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });
    
    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }
    if (comment.userEmail !== userEmail) {
      return res.status(403).send({ message: "Forbidden: You can only edit your own comments" });
    }
    const result = await commentsCollection.updateOne(
      { _id: new ObjectId(commentId) },
      { $set: { text: text, updatedAt: new Date() } }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
  
  


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})