require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

const port = process.env.PROT || 5000
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.megvh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
      await client.connect();
      const servicesCollection = client.db('parts_manufacturer').collection('services');
      const orderCollection = client.db('parts_manufacturer').collection('order');
      const payCollection = client.db('parts_manufacturer').collection('pay');
      const usersCollection = client.db('parts_manufacturer').collection('users');
      const reviewsCollection = client.db('parts_manufacturer').collection('reviews');

      app.post('/create-payment-intent', async(req, res) =>{
        const service = req.body;
        const price = service.price;
        const amount = parseInt(price)*100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount : amount,
          currency: 'usd',
          payment_method_types:['card']
        });
        res.send({clientSecret: paymentIntent.client_secret})
      });
	    
      // all services 
      app.get('/services', async(req, res)=> {
          const query = {};
          const cursor = servicesCollection.find(query)
          const services = await cursor.toArray();
          res.send(services);
      })
	    
      // all reviews
      app.get('/reviews', async(req, res)=> {
          const query = {};
          const cursor = reviewsCollection.find(query)
          const reviews = await cursor.toArray();
          res.send(reviews);
      })
	    
      // all orders
      app.get('/order', async(req, res)=> {
        const query = {};
        const cursor = orderCollection.find(query)
        const order = await cursor.toArray();
        res.send(order);
    })
	    
    // get order by email orders
    app.get('/order', async(req, res)=> {
      let query ;
      const email =  req.query.email;
      if(email){
        query = {email: email}
      }
      else{
        query = {}
      }

      const cursor = orderCollection.find(query)
      const order = await cursor.toArray();
      res.send(order);
  })
	    
    // get one service by id 
      app.get('/service/:id', async(req, res)=> {
        const id = req.params.id;
        const query = {_id: ObjectId(id)}
        const service = await servicesCollection.findOne(query);
        res.send(service);
      })
	    
      // get one order by id 
      app.get('/order/:id', async(req, res)=> {
        const id = req.params.id;
        const query = {_id: ObjectId(id)}
        const order = await orderCollection.findOne(query);
        res.send(order);
      })
      app.patch('/order-update/:id', async(req, res)=> {
        const id = req.params.id;
        const payment = req.body;
        const filter = {_id: ObjectId(id)};
        console.log(payment)
        console.log(payment.transactionId)
        if(payment){
          const updateDoc = {
            $set: {
              paid: true,
              transactionId: payment.transactionId,
            }

          }
          const result = await payCollection.insertOne(payment);
          const updateOrder = await orderCollection.updateOne(filter, updateDoc);
          res.send(updateDoc);
        }
      })
	    
      // // get one order by email
      app.get('/order', async(req, res)=> {
        const email = req.params.email;
        const query = {email: email}
        const order = await orderCollection.findOne(query);
        console.log(email, order)
        res.send(order);
      })
      app.get('/admin/:email', verifyJwt, async(req, res)=> {
        const email = req.params.email;
       const user = await usersCollection.findOne({email: email});
       const isAdmin = user.role === 'admin';
       res.send({admin: isAdmin});
      })
      app.post('/product', verifyJwt, async(req, res)=> {
        const product = req.body;
        const result = await servicesCollection.insertOne(product);
        res.send(result);
      })
	    
      // set order by email
      app.put('/order/:email', async (req, res) => {
        const order = req.params.email;
        const data = req.body
        const filter = { order:  order};
        const options = {upsert: true};
        const uspdateDoc = {
          $set: data,
        };
        const result = await orderCollection.updateOne(filter, uspdateDoc, options);
        res.send(result);
      })
	    
      // set one review
      app.post('/review', verifyJwt, async(req, res)=> {
        const review = req.body;
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
      })
	    
       // set all users
      app.get('/users', verifyJwt, async(req, res)=> {
        const users = await usersCollection.find().toArray();
        res.send(users);
      })
	    
       // get user by email
      app.get('/user/:email', async(req, res)=> {
        const email = req.params.email;
        const user = await usersCollection.findOne({email: email});
        res.send(user);
      })
	    
      // delete order
      app.delete('/order/:id', async(req, res)=>{
        const order = req.body;
        const result = await orderCollection.deleteOne(order);
        res.send(result);
      })
            app.put('/user/admin/:email', verifyJwt, async(req, res) => {
        const email = req.params.email;
        const requester = req.decoded.email;
        const requesterAccount = await usersCollection.findOne({email: requester});
        if(requesterAccount.role === 'admin'){

          const filter = {email: email};
          const uspdateDoc = {
            $set: {role:'admin'},
          };
          const result = await usersCollection.updateOne(filter, uspdateDoc);
          res.send(result);
        }
        else{
          res.status(403).send({message: 'forbidden'});
        }
      })
	    
        // update user 
        app.put('/user/:id', async(req, res)=> {
          const id = req.params.id;
          const updatedUser = req.body;
          const filter = {_id : ObjectId(id)};
          const options = { upsert: true };
          const updateDoc = {
              $set: {
                name: updatedUser.user,
                email: updatedUser.email,
                  address: updatedUser.address,
                  phone: updatedUser.phone,
                  education: updatedUser.education,
              }
          };
          const result = await usersCollection.updateOne(filter, updateDoc, options);
          res.send(result);

      })
	    
      // set user
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

    } 


    finally {
    }
  }
 

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
