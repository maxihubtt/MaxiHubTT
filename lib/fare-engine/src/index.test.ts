import assert from "node:assert/strict";
import test from "node:test";
import {
  BUS_OPTIONS,
  MASTER_FARE_CONFIG,
  busCapacity,
  calculateFare,
  hasSufficientBusCapacity,
  minimumBuses,
  paraminPassengerBracket,
  passengerBracket,
} from "./index";

const standardRouteExamples: Record<string, [string, string]> = {
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
  toco: ["POS", "Toco"],
};

test("covers every standard route with capacity-aware allocations", () => {
  const cases = [
    [12, 1],
    [15, 1],
    [16, 2],
    [20, 2],
    [25, 2],
    [30, 2],
    [31, 3],
  ] as const;

  for (const route of MASTER_FARE_CONFIG.routes.filter(route => route.id !== "paramin")) {
    const [pickup, dropoff] = standardRouteExamples[route.id];
    for (const tripType of ["one-way", "round"] as const) {
      for (const [passengerCount, numberBuses] of cases) {
        const result = calculateFare({ pickup, dropoff, tripType, passengerCount, numberBuses });
        assert.equal(result.status, "approved", `${route.id} ${tripType} ${passengerCount}/${numberBuses}`);
        if (result.status === "approved") {
          assert.equal(result.busBreakdown.length, numberBuses);
          assert.equal(result.baseFare, result.busBreakdown.reduce((sum, bus) => sum + bus.fare, 0));
        }
      }
    }
  }
  assert.equal(MASTER_FARE_CONFIG.routes.length, 14);
});

test("allocates normal-route passengers evenly and charges each bus", () => {
  const sixteen = calculateFare({
    pickup: "POS",
    dropoff: "Diego Martin",
    tripType: "one-way",
    passengerCount: 16,
    numberBuses: 2,
  });
  assert.equal(sixteen.status, "approved");
  if (sixteen.status === "approved") {
    assert.deepEqual(sixteen.busBreakdown.map(bus => [bus.passengerCount, bus.bracket, bus.fare]), [
      [8, "1-12", 350],
      [8, "1-12", 350],
    ]);
    assert.equal(sixteen.baseFare, 700);
  }

  const twentyFive = calculateFare({
    pickup: "POS",
    dropoff: "Diego Martin",
    tripType: "one-way",
    passengerCount: 25,
    numberBuses: 2,
  });
  assert.equal(twentyFive.status, "approved");
  if (twentyFive.status === "approved") {
    assert.deepEqual(twentyFive.busBreakdown.map(bus => [bus.passengerCount, bus.bracket, bus.fare]), [
      [13, "13-15", 450],
      [12, "1-12", 350],
    ]);
    assert.equal(twentyFive.baseFare, 800);
  }
});

test("uses the approved round-trip fare per bus and adds rush once", () => {
  const round = calculateFare({
    pickup: "POS",
    dropoff: "Diego Martin",
    tripType: "round",
    passengerCount: 12,
    numberBuses: 2,
  });
  assert.equal(round.status, "approved");
  if (round.status === "approved") {
    assert.equal(round.baseFare, 1200);
    assert.equal(round.busBreakdown[0]?.fare, 600);
  }

  const rush = calculateFare({
    pickup: "POS",
    dropoff: "Chaguanas",
    tripType: "one-way",
    passengerCount: 20,
    numberBuses: 2,
    pickupDatetime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  assert.equal(rush.status, "approved");
  if (rush.status === "approved") {
    assert.equal(rush.baseFare, 1000);
    assert.equal(rush.rushFee, 150);
    assert.equal(rush.totalFare, 1150);
    assert.equal(rush.deposit, 287.5);
  }
});

test("uses Paramin capacity and brackets instead of standard bus rules", () => {
  assert.equal(paraminPassengerBracket(10), "1-10");
  assert.equal(paraminPassengerBracket(11), "11-20");
  assert.equal(paraminPassengerBracket(21), "21-30");
  assert.equal(minimumBuses(11, "paramin"), 2);
  assert.equal(minimumBuses(21, "paramin"), 3);
  assert.equal(busCapacity(1, "paramin"), 10);
  assert.equal(busCapacity(5, "paramin"), 50);

  for (const [passengerCount, numberBuses, status] of [
    [10, 1, "approved"],
    [11, 1, "invalid"],
    [11, 2, "approved"],
    [20, 2, "approved"],
    [21, 2, "invalid"],
    [21, 3, "approved"],
  ] as const) {
    const result = calculateFare({ pickup: "POS", dropoff: "Paramin", tripType: "one-way", passengerCount, numberBuses });
    assert.equal(result.status, status, `${passengerCount}/${numberBuses}`);
  }
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

test("capacity and bus selection boundaries are explicit", () => {
  assert.equal(hasSufficientBusCapacity(16, 1), false);
  assert.equal(hasSufficientBusCapacity(16, 2), true);
  assert.equal(hasSufficientBusCapacity(51, 5, "paramin"), false);
  assert.equal(busCapacity(5), 75);
  assert.equal(BUS_OPTIONS.at(-1)?.label, "5+ Buses");
  assert.equal(passengerBracket(26), "26+");
  const result = calculateFare({ pickup: "POS", dropoff: "Chaguanas", tripType: "one-way", passengerCount: 12, numberBuses: 2 });
  assert.equal(result.status, "approved");
  if (result.status === "approved") assert.equal(result.baseFare, 1000);
});