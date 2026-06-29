import { Zadanie } from "../models/Zadanie";
import { zadanieRepository } from "../repositories/ZadanieRepository";

export interface GeneratorOptions {
  klasaId: string;
  dzialId?: string;
  tematId?: string;
  poziom?: number;
  liczbaZadan: number;
}

export class GeneratorService {

  generate(options: GeneratorOptions): Zadanie[] {

    let zadania = zadanieRepository.getAll();

    zadania = zadania.filter(
      (z) => z.klasaId === options.klasaId
    );

    if (options.dzialId) {
      zadania = zadania.filter(
        (z) => z.dzialId === options.dzialId
      );
    }

    if (options.tematId) {
      zadania = zadania.filter(
        (z) => z.tematId === options.tematId
      );
    }

    if (options.poziom) {
      zadania = zadania.filter(
        (z) => z.poziom === options.poziom
      );
    }

    return zadania.slice(0, options.liczbaZadan);

  }

}

export const generatorService = new GeneratorService();