import { zadania } from "../database";
import { Zadanie } from "../models/Zadanie";

export class ZadanieRepository {
  getAll(): Zadanie[] {
    return zadania;
  }

  getById(id: string): Zadanie | undefined {
    return zadania.find((z) => z.id === id);
  }

  add(zadanie: Zadanie) {
    zadania.push(zadanie);
  }

  update(id: string, dane: Partial<Zadanie>) {
    const zadanie = this.getById(id);

    if (!zadanie) return;

    Object.assign(zadanie, dane);

    zadanie.updatedAt = new Date().toISOString();
  }

  delete(id: string) {
    const index = zadania.findIndex((z) => z.id === id);

    if (index !== -1) {
      zadania.splice(index, 1);
    }
  }
}

export const zadanieRepository = new ZadanieRepository();