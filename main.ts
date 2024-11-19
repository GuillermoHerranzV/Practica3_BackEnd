import {MongoClient} from 'mongodb';



const MONGO_URL = Deno.env.get("MONGO_URL");
if(!MONGO_URL){
  console.error("MONGO_URL not set");
  Deno.exit(1)
}

const client = new MongoClient(MONGO_URL);
await client.connect();
const db = client.db("BaseParcial")
