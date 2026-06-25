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
    
    app.post('/api/arts' , async(req,res)=>{
        const art = req.body;
        const result = await artCollection.insertOne(art);
        res.send(result)
    })
    app.get('/api/all-arts', async (req, res) => {
    const result = await artCollection.find().toArray();
    res.send(result);
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

   app.delete('/api/arts/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }; 
    const result = await artCollection.deleteOne(query);
    res.send(result);
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