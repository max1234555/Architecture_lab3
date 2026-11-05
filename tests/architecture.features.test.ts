import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotal } from "../src/shared/calculateTotal.ts";
import { StockRepository } from "../src/inventory/StockRepository.ts";
import { database, resetDatabase } from "../src/database.ts";
import { CheckoutController } from "../src/checkout/CheckoutController.ts";
import { runtimeConfig } from "../src/config.ts";

test.beforeEach(() => {
  resetDatabase();
  runtimeConfig.taxRate = 0.2;
  runtimeConfig.discountPercent = 0;
});

test("calculateTotal is pure and does not mutate input lines", () => {
  const lines = [{ productId: "book", unitPrice: 100, quantity: 2 }];
  const config = { taxRate: 0.2, discountPercent: 0 };
  
  const total = calculateTotal(lines, config);
  assert.equal(total, 240);
  
  // Перевірка на відсутність мутації вхідного масиву (lineTotal не додається всередину об'єкта)
  assert.equal((lines[0] as any).lineTotal, undefined);
});

test("Inventory reserve is atomic and prevents partial updates on out-of-stock", () => {
  database.stock.set("item1", { productId: "item1", available: 5 });
  database.stock.set("item2", { productId: "item2", available: 1 }); // Недостатньо для кількості 3

  const stockRepo = new StockRepository();
  const lines = [
    { productId: "item1", unitPrice: 10, quantity: 2 },
    { productId: "item2", unitPrice: 20, quantity: 3 } // Помилка тут
  ];

  assert.throws(() => {
    stockRepo.reserve(lines);
  }, /Insufficient stock/);

  // Перевіряємо, що склад item1 НЕ змінився частково (атомарність резервування)
  assert.equal(stockRepo.find("item1")?.available, 5);
  assert.equal(stockRepo.find("item2")?.available, 1);
});

test("checkout handles processing payment status correctly", async () => {
  database.stock.set("book", { productId: "book", available: 5 });

  const response = await new CheckoutController().checkout({
    orderId: "order-processing",
    paymentToken: "proc_token",
    currency: "UAH",
    lines: [{ productId: "book", unitPrice: 100, quantity: 1 }],
  });

  assert.equal(response.paymentStatus, "processing");
  assert.equal(response.status, "payment_processing");
});