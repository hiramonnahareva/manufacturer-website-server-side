require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

const port = process.env.PROT || 3000
const stripe = require('stripe')('sk_test_51L35QjDWL5z7UYjtbX1UG8Ubj1VNSGQ0QUWfuxhix8u8EajjRKhk0uKbg9ncbOoliUNIVbtd1ixc9jb0LhDQs3qM00cxeZ1bXI');

app.use(cors());
app.use(express.json())

function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ massage: 'Unauthorized access' })
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
    if (error) {
      return res.status(403).send({ massage: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();

  })

}






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yfpxf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
  try {
    await client.connect();


    const database = client.db("recipe-blogs").collection("Add recipe");
    const usersCollection = client.db('recipe-blogs').collection('user');

    app.post('/createRecipe', async (req, res) => {
      const createRecipe = req.body;
      const result = await database.insertOne(createRecipe);
      console.log(`user insert ${result.insertedId} `)
      res.send(result)
      console.log(result)
    })

    app.post('/user', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(`user insert ${result.insertedId} `)
      res.send(result)
      console.log(result)
    })

    app.get('/user', async (req, res) => {
      const query = {}
      const cursor = usersCollection.find(query);
      const items = await cursor.toArray();
      console.log("item");
      res.send(items)
    })
    app.get('/recipes', async (req, res) => {
      const query = {}
      const cursor = database.find(query);
      const items = await cursor.toArray();
      console.log("item");
      res.send(items)
    })
    // get one recipe by id 
    app.get('/recipe/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const recipe = await database.findOne(query);
      res.send(recipe);
    })


    const loginUser = async (credentials) => {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(credentials)
        });
        const data = await response.json();
        localStorage.setItem('token', data.token); // Store token in local storage
        return data;
      } catch (error) {
        console.error('Login failed:', error);
      }
    };

    // set user
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const uspdateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(filter, uspdateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
      res.send({ result, token })
    })

    // set user


    app.get('/user/:email', async (req, res) => {
      const { email } = req.params;

      try {
        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });

      }
    });



    // Purchase Coins

    app.post('/coin/purchase', async (req, res) => {
      const { userId, recipeId } = req.body;

      try {
        const user = await user.findById(userId);
        const recipe = await recipe.findById(recipeId);
        const creator = await user.findById(recipe.creatorId);

        if (user.coins < 10) {
          return res.status(400).json({ message: 'Not enough coins' });
        }

        user.coins -= 10;
        creator.coins += 1;
        recipe.purchased_by.push(user.email);
        recipe.watchCount += 1;

        await user.save();
        await creator.save();
        await recipe.save();

        res.status(200).json({ message: 'Purchase successful' });
      } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
      }
    });

    // app.use(bodyParser.json());

    app.post('/create-checkout-session', async (req, res) => {
      const { amount, paymentMethodId } = req.body;

      const priceLookup = {
        100: 100,  // $1.00
        500: 500,  // $5.00
        1000: 1000, // $10.00
      };

      const price = priceLookup[amount];

      if (!price) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${amount} Coins`,
              },
              unit_amount: price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
      });

      res.json({ sessionId: session.id });
    });

    app.listen(3001, () => console.log('Server running on port 3001'));




  }
  finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})