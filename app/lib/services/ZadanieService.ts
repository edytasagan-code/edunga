import { Zadanie } from "../models/Zadanie";
import { zadanieRepository } from "../repositories/ZadanieRepository";

export class ZadanieService {
  getAll() {
    return zadanieRepository.getAll();
  }

  getById(id: string) {
    return zadanieRepository.getById(id);
  }

  add(zadanie: Zadanie) {
    zadanieRepository.add(zadanie);
  }

  update(id: string, dane: Partial<Zadanie>) {
    zadanieRepository.update(id, dane);
  }

  delete(id: string) {
    zadanieRepository.delete(id);
  }
}

export const zadanieService = new ZadanieService();