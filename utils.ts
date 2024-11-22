import { Collection } from "mongodb";
import { LugaresModel, NinosModel, Lugares, Ninos } from "./types.ts";

export const fromModelToLugar = (model: LugaresModel): Lugares => {
  return {
    id: model._id!.toString(),
    nombre: model.nombre,
    coordenadas: model.coordenadas,
    NumBuenos: model.NumBuenos,
  };
};

export const fromModelToNino = async (
  model: NinosModel,
  LugaresCollection: Collection<LugaresModel>,
): Promise<Ninos> => {
  const lugarDB = await LugaresCollection.findOne({ _id: model.ubicacion });
  if(!lugarDB){
    throw new Error ("No existe la ubicacion")
  }
  const ubicacion = fromModelToLugar(lugarDB);

  return {
    id: model._id!.toString(),
    nombre: model.nombre,
    comportamiento: model.comportamiento,
    ubicacion:ubicacion,
  };
};

export const fromModelsToLugares = (models: LugaresModel[]): Lugares[] => {
  return models.map((model) => fromModelToLugar(model));
};