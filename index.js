const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.PROT || 5000

app.use(cors());
app.use(express.json()) 

function  verifyJwt (req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({massage: 'Unauthorized access'})
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function(error, decoded){
    if(error){
      return res.status(403).send({massage: 'Forbidden access'})
    }
    req.decoded = decoded;
    next();

  })

}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.megvh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
      await client.connect();
      const servicesCollection = client.db('parts_manufacturer').collection('services');
      const orderCollection = client.db('parts_manufacturer').collection('order');
      const usersCollection = client.db('parts_manufacturer').collection('users');
      app.get('/services',verifyJwt, async(req, res)=> {
          const query = {};
          const cursor = servicesCollection.find(query)
          const services = await cursor.toArray();
          res.send(services);

      })
      app.get('/service/:id', async(req, res)=> {
        const id = req.params.id;
        const query = {_id: ObjectId(id)}
        const booking = await servicesCollection.findOne(query);
        res.send(booking);
      })
      app.post('/order', async (req, res) => {
        const order = req.body;
        const result = orderCollection.insertOne(order)
        res.send(result);
        // const query = {service: parchase.name,}
      })
      app.put('/users/:email', async(req, res) => {
        const email = req.params.email;
        const user = req.body;
        const filter = {email: email};
        const options = {upsert: true};
        const uspdateDoc = {
          $set: user,
        };
        const result = await usersCollection.updateOne(filter, uspdateDoc, options);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h'}); 
        res.send({result, token})
      })
    //   console.log('db connent');
    } 
    finally {
    }
  }
  run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})