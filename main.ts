import {MongoClient} from 'mongodb';



const MONGO_URL = "mongodb+srv://ilopeza8:Password@cluster-nebrija.14k0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster-Nebrija";
if(!MONGO_URL){
  console.error("MONGO_URL not set");
  Deno.exit(1)
}

const client = new MongoClient(MONGO_URL);
await client.connect();
const db = client.db("BaseParcial")
