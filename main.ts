import { MongoClient,ObjectId } from "mongodb";
import {fromModelToLugar,fromModelToNino,fromModelsToLugares} from "./utils.ts";
import { LugaresModel, NinosModel } from "./types.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");

if (!MONGO_URL) {
  console.error("MONGO_URL is not set");
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.info("Connected to MongoDB");

const db = client.db("P3_BackEnd");

const NinosCollection = db.collection<NinosModel>("Ninos");
const LugaresCollection = db.collection<LugaresModel>("Lugares");

//Filtra los ninos para sacar solo los buenos
const filtroBuenos = (n: Array <NinosModel>) => {
  return n.filter((nino) => nino.comportamiento === "Bueno");
}

//Filtra los ninos para sacar solo los malos
const filtroMalos = (n: Array <NinosModel>) => {
  return n.filter((nino) => nino.comportamiento === "Malo");
}

//Cuenta el numero de ninos buenos que hay en cada lugar
const conteoBuenos = async (n: Array <NinosModel>) => {

  const lugares = await LugaresCollection.find().toArray();
  return  lugares.map ((lugar) => {

    const ninosContados = n.filter(n => n.ubicacion.toString() === lugar._id.toString());
    return {
      nombre: lugar.nombre,
      coordenadas: lugar.coordenadas,
      NumBuenos: ninosContados.length,
    }

  })

}

const haversine = (lat1:number, lon1:number, lat2:number, lon2:number) => {

  const R = 6371; // Radio de la Tierra en km

  const toRad = (deg:number) => (deg * Math.PI) / 180; // Conversión a radianes

  const dLat = toRad(lat2 - lat1);

  const dLon = toRad(lon2 - lon1);

  const lat1Rad = toRad(lat1);

  const lat2Rad = toRad(lat2);

  const a = Math.sin(dLat / 2) ** 2 +
  Math.cos(lat1Rad) * Math.cos(lat2Rad) *
  Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en km

}

const handler = async (req: Request): Promise<Response> => {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;

  if (method === "GET") {
    if (path === "/ninos/buenos") {

      const ninosDB = await NinosCollection.find().toArray();
      const ninosBuenos = filtroBuenos (ninosDB);

      const ninos = await Promise.all(
        ninosBuenos.map((nino) => fromModelToNino(nino, LugaresCollection)),
      );

      return new Response(JSON.stringify(ninos), {headers: { "Content-Type": "application/json" }});

    } else if (path === "/ninos/malos") {

      const ninosDB = await NinosCollection.find().toArray();
      const ninosMalos = filtroMalos (ninosDB);

      const ninos = await Promise.all(
        ninosMalos.map((nino) => fromModelToNino(nino, LugaresCollection)),
      );

      return new Response(JSON.stringify(ninos), {headers: { "Content-Type": "application/json" }});

    }else if (path === "/entregas"){

      const ninosDB = await NinosCollection.find().toArray();
      //const ninosBuenos = filtroBuenos (ninosDB);

      const arrConteo = await conteoBuenos (filtroBuenos (ninosDB));
      const lugaresOrdenados = arrConteo.sort ((l1, l2) => l2.NumBuenos - l1.NumBuenos);
      return new Response (JSON.stringify(lugaresOrdenados), {headers: { "Content-Type": "application/json" }});

    }else if (path === "/ruta"){

      const ninosDB = await NinosCollection.find().toArray();
      //const ninosBuenos = filtroBuenos (ninosDB);

      const arrConteo = await conteoBuenos (filtroBuenos (ninosDB));
      const lugaresOrdenados = arrConteo.sort ((l1, l2) => l2.NumBuenos - l1.NumBuenos);
      const distanciaTotal = lugaresOrdenados.reduce ((acc, lugar, i) => {

        if (i === 0){return acc;}

        const lugarAnterior = lugaresOrdenados [i-1];

        const distancia = haversine (lugarAnterior.coordenadas.Latitud, lugarAnterior.coordenadas.Longitud, lugar.coordenadas.Latitud, lugar.coordenadas.Longitud);

        return acc + distancia;
      }, 0);

      return new Response (JSON.stringify(distanciaTotal), {headers: { "Content-Type": "application/json" }})

    }

  } else if (method === "POST") {

    if (path === "/ubicacion") {

      const lugar = await req.json();

      //Comprueba que se han introducido todos los datos
      if (!lugar.nombre || !lugar.coordenadas || lugar.NumBuenos === undefined) {
        return new Response("Bad request", { status: 400 });
      }

      //Comprueba que las coordenadas sean correctas
      if (lugar.coordenadas.Latitud < -90 || lugar.coordenadas.Latitud > 90 ||
        lugar.coordenadas.Longitud < -180 || lugar.coordenadas.Longitud > 180) {
        return new Response("Bad request", { status: 400 });
      }

      const { insertedId } = await LugaresCollection.insertOne({
        nombre: lugar.nombre,
        coordenadas: lugar.coordenadas,
        NumBuenos: lugar.NumBuenos,
      });

      return new Response(
        JSON.stringify({
          id: insertedId,
          ...lugar,
        }),
        { status: 201, headers: { "Content-Type": "application/json" }}
      );

    } else if (path === "/ninos") {

      const nino = await req.json();
      
      //Comprueba que se han introducido todos los datos
      if (!nino.nombre || !nino.comportamiento || !nino.ubicacion) {
        return new Response("Bad request", { status: 400 });
      }

      //Comprueba que el comportamiento es bueno o malo y no otra cosa
      if (nino.comportamiento !== "Bueno" && nino.comportamiento !== "Malo") {
        return new Response("Comportamiento inválido", { status: 400 });
      }

      //Si el nombre ya existe se inicializa la variable
      const ninoExists = await NinosCollection.findOne({ nombre: nino.nombre });

      //Si la variable esta inicializada el nombre existe y no se puede meter otra vez
      if (ninoExists) {
        return new Response("Ya existe ese nombre", { status: 409 });
      }

      const ubicacionString:string = nino.ubicacion;

      //Comprueba que la ubicacion existe
      const lugarExists = await LugaresCollection.findOne({
        nombre:ubicacionString,
      });

      //La ubicacion tiene que existir para poder asignarse
      if (!lugarExists) {
        return new Response("Ubicación no encontrada", { status: 404 });
      }

      const { insertedId } = await NinosCollection.insertOne({
        nombre: nino.nombre,
        comportamiento: nino.comportamiento,
        ubicacion: new ObjectId(lugarExists._id),
      });

      return new Response(
        JSON.stringify({
          id: insertedId,
          ...nino,
        }),
        { status: 201, headers: { "Content-Type": "application/json" }}
      );
    }
  }

  return new Response("Endpoint not found", { status: 404 });
};

Deno.serve({ port: 6768 }, handler);
