import express, { json } from "express"
import cors from "cors"
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from "jose";
const app = express()
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

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
const bookings = db.collection("bookings")

const varifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized access" })
    }
    const token = authHeader.split(" ")[1]
    if (!token) {
        return res.status(401).send({ message: "Unauthorized access" })
    }

    const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))
    try {
        const { payload } = await jwtVerify(token, JWKS)
        next()

    } catch (error) {
        return res.status(500).send({ message: "Token verification failed" })
    }

}

app.get('/', (req, res) => {
    res.send({ Msg: "API is working" })
})

// http://localhost:5000/add-studio
app.post('/add-studio', varifyToken, async (req, res) => {
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

app.patch('/update-studio/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
        $set: req.body
    }
    const result = await studios.updateOne(filter, updateDoc);
    res.send(result)
})

app.delete('/delete-studio/:id', varifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await studios.deleteOne(query)
    res.send(result)
})

app.post('/add-bookings', varifyToken, async (req, res) => {
    const booking = req.body;
    const existing = await bookings.findOne({
        studioId: booking.studioId,
        bookingDate: booking.bookingDate,
        startTime: { $lt: booking.endTime },
        endTime: { $gt: booking.startTime },
    });
    if (existing) {
        return res.status(409).send({
            message: "This time slot is already booked.",
        });
    }
    booking.status = "Pending";
    const result = await bookings.insertOne(booking);
    res.send(result);
})

app.get("/bookings/:email", async (req, res) => {
    const email = req.params.email;
    const result = await bookings.find({ userEmail: email }).toArray();
    res.send(result)
})

app.patch("/booking/cancel/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id), status: "Pending" };
    const updateDoc = {
        $set: {
            status: "Cancelled"
        }
    }
    const result = await bookings.updateOne(filter, updateDoc);
    res.send(result);
})

app.listen(PORT, (req, res) => {
    console.log(`Server running on PORT ${PORT}`);
})

export default app;