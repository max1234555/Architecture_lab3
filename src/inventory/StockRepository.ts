import { database } from "../database.ts";
import type { CartLine } from "../shared/calculateTotal.ts";

export class StockRepository {
  find(productId: string) {
    return database.stock.get(productId);
  }

  // Inventory сам захищає інваріант available >= 0 (атомарне резервування)
  reserve(lines: CartLine[]): void {
    // Спочатку перевіряємо наявність усіх позицій (атомарність перевірки)
    for (const line of lines) {
      const row = database.stock.get(line.productId);
      if (!row || row.available < line.quantity) {
        throw new Error(`Insufficient stock for ${line.productId}`);
      }
    }

    // Якщо все є — зменшуємо залишки
    for (const line of lines) {
      const row = database.stock.get(line.productId)!;
      database.stock.set(line.productId, {
        productId: line.productId,
        available: row.available - line.quantity,
      });
    }
  }
}