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
    const orderCollection = database.collection("orders")
    const tierCollection = database.collection("tier")
    const subscriptionCollection = database.collection("subscriptions")
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
  app.post('/api/orders', async (req, res) => {
      try {
        const { artId, artTitle, artistName,artistId,artImage, price,userId, userEmail, userName } = req.body;

        const newOrder = {
          artId,
          artTitle,
          artistName,
          artistId,
          artImage,
          price: parseFloat(price),
          userId,
          userEmail,
          userName,
          purchaseDate: new Date()
        };

        const result = await orderCollection.insertOne(newOrder);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });
   app.get('/api/admin/transactions', async (req, res) => {
  try {
    const orders = await orderCollection.find({}).toArray();
    const purchaseTransactions = orders.map(order => ({
      transactionId: order._id,
      type: 'purchase',
      userId: order.userId || null,
      email: order.userEmail || 'N/A',
      amount: Number(order.price) || 0,
      date: order.purchaseDate
    }));

   let subscriptionTransactions = [];
try {
  const subscriptions = await subscriptionCollection.find({}).toArray();
  subscriptionTransactions = await Promise.all(subscriptions.map(async (sub) => {
    let calculatedAmount = 0;
    if (sub.tierId === 'user_pro') {
      calculatedAmount = 19.99; 
    } else if (sub.tierId === 'artist_premium') {
      calculatedAmount = 49.99; 
    }
    const matchedUser = await userCollection.findOne({ email: sub.email });
    const foundUserId = matchedUser ? matchedUser._id : null;

    return {
      transactionId: sub._id,
      type: 'subscription',
      userId: foundUserId || null,
      email: sub.email || 'N/A',
      amount: calculatedAmount,
      date: sub.createdAt || sub.date
    };
  }));
    } catch (e) {
      console.log("Subscription collection not found or empty", e.message);
    }
    const allTransactions = [...purchaseTransactions, ...subscriptionTransactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.send(allTransactions);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
 
 app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await userCollection
      .find({}, { projection: { password: 0 } }) 
      .toArray();

    res.send(users);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
  
  app.get('/api/tier' , async(req, res)=>{
    const query = {}
    if(req.query.tier_id){
      query.id = req.query.tier_id
    }
    const tier = await tierCollection.findOne(query);
    res.send(tier)
  })
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

   app.get('/api/orders', async (req,res)=>{
    const query = {};
    if(req.query.userId){
      query.userId= req.query.userId;
    }
    if(req.query.artId){
      query.artId = req.query.artId;
    }
    const cursor = orderCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
   })
   
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
   app.get('/api/user-purchases/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await orderCollection
      .find({ userId: userId }) 
      .sort({ purchaseDate: -1 }) 
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
app.get('/api/artist-sales/:artistId', async (req, res) => {
  try {
    const artistId = req.params.artistId;
    const sales = await orderCollection
      .find({ artistId: artistId }) 
      .sort({ purchaseDate: -1 }) 
      .toArray();

    res.send(sales);
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



app.delete('/api/admin/artwork/:id', async (req, res) => {
  try {
    const artworkId = req.params.id;
    const result = await artCollection.deleteOne({ _id: new ObjectId(artworkId) });
    if (result.deletedCount > 0) {
      await purchaseCollection.updateMany(
        { artId: new ObjectId(artworkId) },
        { $set: { artId: null } }
      );
      res.send({ success: true, message: "Artwork deleted and purchases updated successfully!" });
    } else {
      res.status(404).send({ error: "Artwork not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
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

  app.delete('/api/comments/:commentId/reply/:replyId', async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const { userEmail } = req.query; 

    if (!userEmail) {
      return res.status(400).send({ message: "User email is required" });
    }

    const comment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });
    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }

    const reply = comment.replies?.find(r => r.replyId.toString() === replyId);
    if (!reply) {
      return res.status(404).send({ message: "Reply not found" });
    }

    if (reply.userEmail !== userEmail) {
      return res.status(403).send({ message: "You can only delete your own reply!" });
    }

    const result = await commentsCollection.updateOne(
      { _id: new ObjectId(commentId) },
      { $pull: { replies: { replyId: new ObjectId(replyId) } } }
    );

    res.send({ success: true, message: "Reply deleted successfully", result });
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

  app.patch('/api/admin/update-role', async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role: newRole } }
    );

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: "Role updated successfully!" });
    } else {
      res.status(400).send({ error: "Failed to update or role is already the same" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
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

  app.put('/api/comments/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail, userName, userImage, text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).send({ message: "Reply text cannot be empty" });
    }

    const newReply = {
      replyId: new ObjectId(),
      userEmail,
      userName,
      userImage,
      text,
      createdAt: new Date()
    };

    const result = await commentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { replies: newReply } }
    );

    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
  
  app.post('/api/subscriptions' , async(req,res)=>{
    const data = req.body;
    const subsInfo = {
      ...data,
      createdAt: new Date()
    }
    const result = await subscriptionCollection.insertOne(subsInfo);
    const filter = {email: data.email};
    const updateDocument = {
      $set: {
       tier: data.tierId
      }
    }
    const updateResult = await userCollection.updateOne(filter , updateDocument)
    res.send(updateResult)
  })


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