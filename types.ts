
import { ObjectId, type OptionalId } from "mongodb";

export type NinosModel = OptionalId<{
    nombre: string;
    comportamiento: BuenoMalo;
    ubicacion: ObjectId;
}>;

export type LugaresModel = OptionalId<{
    nombre: string;
    coordenadas: Coordenadas;
    NumBuenos: number;
}>;

export type Ninos = {
    id: string;
    nombre: string;
    comportamiento: BuenoMalo;
    ubicacion: Lugares;
};

export type Lugares = {
    id: string;
    nombre: string;
    coordenadas: Coordenadas;
    NumBuenos: number;
}

export enum BuenoMalo {
    Bueno = "Bueno",
    Malo = "Malo"
}

export type Coordenadas = {
  Latitud: number;
  Longitud: number;
};