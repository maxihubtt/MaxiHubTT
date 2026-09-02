import assert from "node:assert/strict";
import test from "node:test";
import {
  BUS_OPTIONS,
  MASTER_FARE_CONFIG,
  calculateFare,
  hasSufficientBusCapacity,
  passengerBracket,
} from "./index";

const bracketExamples = [1, 12, 13, 15, 16, 18, 19, 25, 26];
const routeExamples: Record<string, [string, string]> = {
  "pos-central": ["POS", "Chaguanas"],
  "pos-east-near": ["POS", "San Juan"],
  "pos-east-mid": ["POS", "Tunapuna"],
  "pos-east-far": ["POS", "Arima"],
  "pos-west-near": ["POS", "Diego Martin"],
  "pos-west-mid": ["POS", "Maraval"],
  "pos-west-far": ["POS", "Chaguaramas"],
  "west-central": ["Diego Martin", "Chaguanas"],
  "intra-west": ["Diego Martin", "Maraval"],
  "intra-central": ["Chaguanas", "Cunupia"],
  "intra-east": ["San Juan", "Arima"],
  "intra-south": ["San Fernando", "Princes Town"],
  paramin: ["POS", "Paramin"],
  toco: ["POS", "Toco"],
};

test("covers every configured route and passenger bracket", () => {
  for (const route of MASTER_FARE_CONFIG.routes) {
    const [pickup, dropoff] = routeExamples[route.id];
    for (const tripType of ["one-way", "round"] as const) {
      for (const passengers of bracketExamples) {
        const buses = passengers <= 15 ? 1 : 2;
        const result = calculateFare({
          pickup,
          dropoff,
          tripType,
          passengerCount: passengers,
          numberBuses: buses,
        });
        if (passengers <= 25) assert.equal(result.status, "approved", `${route.id} ${tripType} ${passengers}`);
        else assert.equal(result.status, "custom_quote", `${route.id} ${tripType} ${passengers}`);
      }
    }
  }
  assert.equal(MASTER_FARE_CONFIG.routes.length, 14);
});

test("uses exact proposed values and applies rush to the total before deposit", () => {
  const result = calculateFare({
    pickup: "Port of Spain",
    dropoff: "Chaguanas",
    tripType: "one-way",
    passengerCount: 12,
    numberBuses: 1,
    pickupDatetime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  assert.deepEqual(
    result.status === "approved" ? [result.baseFare, result.rushFee, result.totalFare, result.deposit] : null,
    [500, 150, 650, 162.5],
  );
});

test("never invents a price for unknown, airport, or beach routes", () => {
  for (const [pickup, dropoff] of [
    ["Unknown place", "Chaguanas"],
    ["POS", "Piarco Airport"],
    ["POS", "Maracas Bay"],
  ]) {
    const result = calculateFare({ pickup, dropoff, tripType: "one-way", passengerCount: 12, numberBuses: 1 });
    assert.equal(result.status, "custom_quote");
    assert.equal(result.totalFare, null);
  }
});

test("capacity is explicit and a larger bus count does not multiply a fare", () => {
  assert.equal(hasSufficientBusCapacity(16, 1), false);
  assert.equal(hasSufficientBusCapacity(16, 2), true);
  assert.equal(BUS_OPTIONS.at(-1)?.label, "5+ Buses");
  assert.equal(passengerBracket(26), "26+");
  const result = calculateFare({ pickup: "POS", dropoff: "Chaguanas", tripType: "one-way", passengerCount: 12, numberBuses: 2 });
  assert.equal(result.status, "custom_quote");
});