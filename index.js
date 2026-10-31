import express, { json } from "express"
import cors from "cors"
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
const app = express()
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(json())

const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}
const mongoClient = await connectToMongoDB()
const db = mongoClient.db("StudioSpace")
// studios collection
const studios = db.collection("studios")

app.get('/', (req, res) => {
    res.send({ Msg: "API is working" })
})

// http://localhost:5000/add-studio
app.post('/add-studio', async (req, res) => {
    const studio = req.body;
    const result = await studios.insertOne(studio)
    res.send(result)
})

// http://localhost:5000/studios
app.get('/studios', async (req, res) => {
    const result = await studios.find().toArray()
    res.send(result)
})

app.get('/featured-studio-data', async (req, res) => {
    const result = await studios.find().sort({ _id: -1 }).limit(6).toArray()
    res.send(result)
})

app.get("/studios/owner/:email", async (req, res) => {
    const email = req.params.email;
    const result = await studios.find({ ownerEmail: email }).toArray();
    res.send(result);
});

// http://localhost:5000/studios/:id
app.get('/studios/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await studios.findOne(query)
    res.send(result)
})




app.listen(PORT, (req, res) => {
    console.log(`Server running on PORT ${PORT}`);
})