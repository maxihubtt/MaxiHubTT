export type TripType = "one-way" | "round";
export type FareStatus = "approved" | "custom_quote" | "invalid";
export type PassengerBracket = "1-12" | "13-15" | "16-18" | "19-25" | "26+";
export type ParaminPassengerBracket = "1-10" | "11-20" | "21-30" | "31-40" | "41+";
export type LocationGroup =
  | "pos"
  | "west-near"
  | "west-mid"
  | "west-far"
  | "central"
  | "east-near"
  | "east-mid"
  | "east-far"
  | "south"
  | "beach"
  | "airport"
  | "paramin"
  | "toco";
export type BusCount = 1 | 2 | 3 | 4 | 5;

export const CUSTOM_QUOTE_MESSAGE =
  "We don't currently have a fixed online fare for this route and booking combination. Please contact Maxi Hub TT for a customized quote.";

export const PASSENGER_BRACKETS: readonly PassengerBracket[] = [
  "1-12",
  "13-15",
  "16-18",
  "19-25",
  "26+",
];

export const PARAMIN_PASSENGER_BRACKETS: readonly ParaminPassengerBracket[] = [
  "1-10",
  "11-20",
  "21-30",
  "31-40",
  "41+",
];

export const BUS_OPTIONS: readonly { value: BusCount; label: string }[] = [
  { value: 1, label: "1 Bus" },
  { value: 2, label: "2 Buses" },
  { value: 3, label: "3 Buses" },
  { value: 4, label: "4 Buses" },
  { value: 5, label: "5+ Buses" },
];

export const DEFAULT_FARE_SETTINGS = {
  depositPct: 25,
  rushFee: 150,
  sameDayMinHours: 2,
  minBookingHours: 6,
} as const;

type StandardFareTable = Record<TripType, Record<PassengerBracket, number | null>>;
type ParaminFareTable = Record<TripType, Record<ParaminPassengerBracket, number | null>>;

type StandardRouteFareRecord = {
  id: string;
  label: string;
  groups: readonly [LocationGroup, LocationGroup] | readonly [LocationGroup];
  bracketScheme: "standard";
  capacityPerBus: 15;
  fares: StandardFareTable;
  active: boolean;
  notes?: string;
};

type ParaminRouteFareRecord = {
  id: string;
  label: string;
  groups: readonly [LocationGroup];
  bracketScheme: "paramin";
  capacityPerBus: 10;
  fares: ParaminFareTable;
  active: boolean;
  notes?: string;
};

type RouteFareRecord = StandardRouteFareRecord | ParaminRouteFareRecord;

const table = (
  oneWay: [number | null, number | null, number | null, number | null, number | null],
  round: [number | null, number | null, number | null, number | null, number | null],
): StandardFareTable => ({
  "one-way": Object.fromEntries(PASSENGER_BRACKETS.map((bracket, index) => [bracket, oneWay[index]])) as StandardFareTable["one-way"],
  round: Object.fromEntries(PASSENGER_BRACKETS.map((bracket, index) => [bracket, round[index]])) as StandardFareTable["round"],
});

const paraminTable = (
  oneWay: [number | null, number | null, number | null, number | null, number | null],
  round: [number | null, number | null, number | null, number | null, number | null],
): ParaminFareTable => ({
  "one-way": Object.fromEntries(PARAMIN_PASSENGER_BRACKETS.map((bracket, index) => [bracket, oneWay[index]])) as ParaminFareTable["one-way"],
  round: Object.fromEntries(PARAMIN_PASSENGER_BRACKETS.map((bracket, index) => [bracket, round[index]])) as ParaminFareTable["round"],
});

const route = (
  id: string,
  label: string,
  groups: readonly [LocationGroup, LocationGroup] | readonly [LocationGroup],
  oneWay: [number | null, number | null, number | null, number | null, number | null],
  round: [number | null, number | null, number | null, number | null, number | null],
  notes?: string,
): RouteFareRecord => ({
  id,
  label,
  groups,
  bracketScheme: "standard",
  capacityPerBus: 15,
  fares: table(oneWay, round),
  active: true,
  notes,
});

const paraminRoute = (
  id: string,
  label: string,
  oneWay: [number | null, number | null, number | null, number | null, number | null],
  round: [number | null, number | null, number | null, number | null, number | null],
  notes?: string,
): ParaminRouteFareRecord => ({
  id,
  label,
  groups: ["paramin"],
  bracketScheme: "paramin",
  capacityPerBus: 10,
  fares: paraminTable(oneWay, round),
  active: true,
  notes,
});

/**
 * The single approved fare source used by both the browser and the API.
 *
 * Approved route prices are per bus. The fare engine allocates passengers
 * across the selected buses, looks up the applicable per-bus bracket, and
 * adds each bus fare without applying an automatic discount.
 */
export const MASTER_FARE_CONFIG = {
  settings: DEFAULT_FARE_SETTINGS,
  routes: [
    route("pos-central", "POS ↔ Central", ["pos", "central"], [500, 600, 800, 1500, null], [800, 900, 1000, 2000, null]),
    route("pos-east-near", "POS ↔ East Near", ["pos", "east-near"], [300, 400, 550, 1000, null], [500, 600, 750, 1400, null]),
    route("pos-east-mid", "POS ↔ East Mid", ["pos", "east-mid"], [400, 500, 700, 1200, null], [700, 800, 950, 1600, null]),
    route("pos-east-far", "POS ↔ East Far", ["pos", "east-far"], [550, 650, 850, 1400, null], [900, 1050, 1250, 1900, null]),
    route("pos-west-near", "POS ↔ West Near", ["pos", "west-near"], [350, 450, 600, 1100, null], [600, 700, 850, 1500, null]),
    route("pos-west-mid", "POS ↔ West Mid", ["pos", "west-mid"], [450, 550, 700, 1250, null], [750, 850, 1000, 1700, null]),
    route("pos-west-far", "POS ↔ West Far", ["pos", "west-far"], [600, 700, 900, 1400, null], [1000, 1150, 1350, 1900, null]),
    route("west-central", "WEST ↔ Central", ["west-near", "central"], [500, 600, 800, 1500, null], [800, 900, 1000, 2000, null]),
    route("intra-west", "Intra-West", ["west-near"], [200, 250, 350, 700, null], [350, 425, 550, 900, null], "Applies to all approved West subgroups."),
    route("intra-central", "Intra-Central", ["central"], [200, 250, 350, 700, null], [350, 425, 550, 900, null]),
    route("intra-east", "Intra-East", ["east-near"], [225, 275, 375, 750, null], [400, 475, 600, 950, null], "Applies to all approved East subgroups."),
    route("intra-south", "Intra-South", ["south"], [225, 275, 375, 750, null], [400, 475, 600, 950, null]),
    paraminRoute("paramin", "Paramin", [600, 700, 900, 1500, null], [1000, 1150, 1350, 2000, null], "Special route; maximum 10 passengers per bus."),
    route("toco", "Toco", ["toco"], [1000, 1150, 1400, 2000, null], [1700, 1950, 2300, 2900, null], "Special destination with its own approved fares."),
  ],
  /**
   * Exact special fares override category fares. It is intentionally empty
   * until Maxi Hub TT approves an exact beach, airport, hotel, venue, or
   * residence price. Empty does not mean zero; it means custom quote.
   */
  specialFares: [] as readonly {
    id: string;
    originAliases: readonly string[];
    destinationAliases: readonly string[];
     fares: StandardFareTable;
    active: boolean;
  }[],
  beachFares: [] as readonly unknown[],
  airportFares: [] as readonly unknown[],
} as const;

type AliasRecord = {
  group: LocationGroup;
  label: string;
  aliases: readonly string[];
  special?: boolean;
};

const LOCATION_ALIASES: readonly AliasRecord[] = [
  { group: "pos", label: "POS / Port of Spain", aliases: ["port of spain", "pos", "downtown", "woodbrook", "st anns", "saint anns", "queens park", "the savannah", "city gate"] },
  { group: "west-near", label: "West Near", aliases: ["st james", "saint james", "cocorite", "diego martin", "diego martin valley"] },
  { group: "west-mid", label: "West Mid", aliases: ["petit valley", "maraval", "westmoorings", "west moorings"] },
  { group: "west-far", label: "West Far", aliases: ["carenage", "chaguaramas", "chaguaramas bay"] },
  { group: "east-near", label: "East Near", aliases: ["laventille", "barataria", "san juan"] },
  { group: "east-mid", label: "East Mid", aliases: ["el socorro", "tunapuna", "trincity", "piarco"] },
  { group: "east-far", label: "East Far", aliases: ["arouca", "arima", "sangre grande", "valencia"] },
  { group: "central", label: "Central", aliases: ["chaguanas", "cunupia", "couva", "freeport", "carapichaima", "point lisas"] },
  { group: "south", label: "South", aliases: ["san fernando", "princes town", "prince town", "point fortin", "penal", "siparia", "fyzabad", "gasparillo", "mayaro", "rio claro"] },
  { group: "beach", label: "Beach", special: true, aliases: ["maracas bay", "maracas", "las cuevas", "blanchisseuse beach", "manzanilla beach", "mayaro beach", "vessigny beach", "icacos beach", "erin bay", "guapo beach", "quinam beach"] },
  { group: "airport", label: "Piarco International Airport", special: true, aliases: ["piarco international airport", "piarco airport", "international airport", "airport"] },
  { group: "paramin", label: "Paramin", special: true, aliases: ["paramin", "paramin village"] },
  { group: "toco", label: "Toco", special: true, aliases: ["toco", "toco village", "toco bay", "toco beach"] },
];

const normalizeForMatch = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[.,'’`]/g, "")
    .replace(/\bmt\b/g, "mount")
    .replace(/\bst\b/g, "saint")
    .replace(/\s+/g, " ")
    .trim();

export function normalizeLocation(raw: string): string {
  return normalizeForMatch(raw);
}

export type ResolvedLocation = {
  raw: string;
  normalized: string;
  group: LocationGroup | null;
  label: string | null;
  ambiguous: boolean;
  matchedGroups: readonly LocationGroup[];
  special: boolean;
};

export function resolveLocation(raw: string): ResolvedLocation {
  const normalized = normalizeForMatch(raw);
  if (!normalized) {
    return { raw, normalized, group: null, label: null, ambiguous: false, matchedGroups: [], special: false };
  }

  const rawMatches = LOCATION_ALIASES.filter(({ aliases }) =>
    aliases.some(alias => normalized.includes(normalizeForMatch(alias))),
  );
  const specialMatches = rawMatches.filter(match => match.special);
  const matches = specialMatches.length > 0 ? specialMatches : rawMatches;
  const groups = [...new Set(matches.map(match => match.group))];
  const selected = matches.sort((a, b) =>
    Math.max(...b.aliases.map(alias => normalizeForMatch(alias).length)) -
    Math.max(...a.aliases.map(alias => normalizeForMatch(alias).length)),
  )[0];

  return {
    raw,
    normalized,
    group: groups.length === 1 ? groups[0] : null,
    label: groups.length === 1 ? selected?.label ?? null : null,
    ambiguous: groups.length > 1,
    matchedGroups: groups,
    special: selected?.special === true,
  };
}

export const LOCATION_SUGGESTIONS = LOCATION_ALIASES.flatMap(({ aliases }) => aliases.map(alias => alias.replace(/\bsaint\b/g, "St.")));

export function passengerBracket(passengerCount: number): PassengerBracket | null {
  if (!Number.isInteger(passengerCount) || passengerCount < 1) return null;
  if (passengerCount <= 12) return "1-12";
  if (passengerCount <= 15) return "13-15";
  if (passengerCount <= 18) return "16-18";
  if (passengerCount <= 25) return "19-25";
  return "26+";
}

export function paraminPassengerBracket(passengerCount: number): ParaminPassengerBracket | null {
  if (!Number.isInteger(passengerCount) || passengerCount < 1) return null;
  if (passengerCount <= 10) return "1-10";
  if (passengerCount <= 20) return "11-20";
  if (passengerCount <= 30) return "21-30";
  if (passengerCount <= 40) return "31-40";
  return "41+";
}

export function busCapacity(numberBuses: number, routeType: "standard" | "paramin" = "standard"): number {
  if (!Number.isInteger(numberBuses) || numberBuses < 1 || numberBuses > 5) return 0;
  return numberBuses * (routeType === "paramin" ? 10 : 15);
}

export function minimumBuses(passengerCount: number, routeType: "standard" | "paramin" = "standard"): number {
  const capacity = routeType === "paramin" ? 10 : 15;
  return Math.max(1, Math.ceil(passengerCount / capacity));
}

export function hasSufficientBusCapacity(
  passengerCount: number,
  numberBuses: number,
  routeType: "standard" | "paramin" = "standard",
): boolean {
  return Number.isInteger(passengerCount)
    && passengerCount >= 1
    && Number.isInteger(numberBuses)
    && numberBuses >= 1
    && numberBuses <= 5
    && passengerCount <= busCapacity(numberBuses, routeType);
}

function allocatePassengers(passengerCount: number, numberBuses: number): number[] {
  const perBus = Math.floor(passengerCount / numberBuses);
  const remainder = passengerCount % numberBuses;
  return Array.from({ length: numberBuses }, (_, index) => perBus + (index < remainder ? 1 : 0));
}

export function classifyUrgency(
  pickupDatetime: string | null | undefined,
  settings: { sameDayMinHours: number; minBookingHours: number } = DEFAULT_FARE_SETTINGS,
  now = Date.now(),
): "standard" | "same_day" | "urgent" {
  if (!pickupDatetime) return "standard";
  const hoursUntil = (new Date(pickupDatetime).getTime() - now) / (1000 * 60 * 60);
  if (hoursUntil < settings.sameDayMinHours) return "urgent";
  if (hoursUntil < settings.minBookingHours) return "same_day";
  return "standard";
}

type FareInput = {
  pickup: string;
  dropoff: string;
  tripType: TripType;
  passengerCount: number;
  numberBuses: number;
  pickupDatetime?: string | null;
  now?: number;
  depositPct?: number;
  rushFee?: number;
  sameDayMinHours?: number;
  minBookingHours?: number;
};

export type FareCalculation =
  | {
      status: "approved";
      message: null;
      routeId: string;
      routeLabel: string;
      bracket: PassengerBracket | ParaminPassengerBracket;
      busBreakdown: readonly {
        bus: number;
        passengerCount: number;
        bracket: PassengerBracket | ParaminPassengerBracket;
        fare: number;
      }[];
      baseFare: number;
      rushFee: number;
      totalFare: number;
      deposit: number;
      urgency: "standard" | "same_day" | "urgent";
    }
  | {
      status: "custom_quote";
      message: string;
      routeId: string | null;
      routeLabel: string | null;
      bracket: PassengerBracket | ParaminPassengerBracket;
      busBreakdown: readonly [];
      rushFee: 0;
      totalFare: null;
      deposit: null;
      urgency: "standard" | "same_day" | "urgent";
    }
  | {
      status: "invalid";
      message: string;
      routeId: null;
      routeLabel: null;
      bracket: PassengerBracket | ParaminPassengerBracket | null;
      busBreakdown: readonly [];
      rushFee: 0;
      totalFare: null;
      deposit: null;
      urgency: "standard" | "same_day" | "urgent";
    };

function categoryRouteId(pickup: LocationGroup, dropoff: LocationGroup): string | null {
  const pair = new Set([pickup, dropoff]);
  if (pair.has("paramin")) return "paramin";
  if (pair.has("toco")) return "toco";
  if (pair.has("beach") || pair.has("airport")) return null;

  if (pair.has("pos")) {
    const other = pickup === "pos" ? dropoff : pickup;
    if (["central", "east-near", "east-mid", "east-far", "west-near", "west-mid", "west-far"].includes(other)) {
      return `pos-${other}`;
    }
    return null;
  }

  if ((pickup.startsWith("west-") && dropoff === "central") || (dropoff.startsWith("west-") && pickup === "central")) {
    return "west-central";
  }
  if (pickup.startsWith("west-") && dropoff.startsWith("west-")) return "intra-west";
  if (pickup.startsWith("east-") && dropoff.startsWith("east-")) return "intra-east";
  if (pickup === "central" && dropoff === "central") return "intra-central";
  if (pickup === "south" && dropoff === "south") return "intra-south";
  return null;
}

function findExactSpecialFare(
  pickup: ResolvedLocation,
  dropoff: ResolvedLocation,
  tripType: TripType,
) {
  return MASTER_FARE_CONFIG.specialFares.find(record => {
    if (!record.active) return false;
    const pickupMatches = record.originAliases.some(alias => pickup.normalized.includes(normalizeForMatch(alias)));
    const dropoffMatches = record.destinationAliases.some(alias => dropoff.normalized.includes(normalizeForMatch(alias)));
    const reversePickupMatches = record.originAliases.some(alias => dropoff.normalized.includes(normalizeForMatch(alias)));
    const reverseDropoffMatches = record.destinationAliases.some(alias => pickup.normalized.includes(normalizeForMatch(alias)));
    return (pickupMatches && dropoffMatches) || (reversePickupMatches && reverseDropoffMatches)
      ? Object.values(record.fares[tripType]).some(fare => fare !== null)
      : false;
  });
}

export function calculateFare(input: FareInput): FareCalculation {
  const urgency = classifyUrgency(
    input.pickupDatetime,
    {
      sameDayMinHours: input.sameDayMinHours ?? DEFAULT_FARE_SETTINGS.sameDayMinHours,
      minBookingHours: input.minBookingHours ?? DEFAULT_FARE_SETTINGS.minBookingHours,
    },
    input.now,
  );
  const numberBuses = input.numberBuses;
  const pickup = resolveLocation(input.pickup);
  const dropoff = resolveLocation(input.dropoff);
  const isParaminRoute = pickup.group === "paramin" || dropoff.group === "paramin";
  const routeType = isParaminRoute ? "paramin" : "standard";
  const bracket = isParaminRoute
    ? paraminPassengerBracket(input.passengerCount)
    : passengerBracket(input.passengerCount);

  if (!bracket) {
    return {
      status: "invalid",
      message: "Enter a valid passenger count.",
      routeId: null,
      routeLabel: null,
      bracket: null,
      busBreakdown: [],
      rushFee: 0,
      totalFare: null,
      deposit: null,
      urgency,
    };
  }
  if (!hasSufficientBusCapacity(input.passengerCount, numberBuses, routeType)) {
    return {
      status: "invalid",
      message: isParaminRoute
        ? "Not enough buses selected for Paramin. Paramin bookings are limited to a maximum of 10 passengers per bus due to the steep terrain."
        : "Not enough buses selected. Please select enough buses to accommodate all passengers.",
      routeId: null,
      routeLabel: null,
      bracket,
      busBreakdown: [],
      rushFee: 0,
      totalFare: null,
      deposit: null,
      urgency,
    };
  }

  if (pickup.ambiguous || dropoff.ambiguous || !pickup.group || !dropoff.group) {
    return {
      status: "custom_quote",
      message: CUSTOM_QUOTE_MESSAGE,
      routeId: null,
      routeLabel: null,
      bracket,
      busBreakdown: [],
      rushFee: 0,
      totalFare: null,
      deposit: null,
      urgency,
    };
  }

  const exactSpecial = findExactSpecialFare(pickup, dropoff, input.tripType);
  const routeId = exactSpecial?.id ?? categoryRouteId(pickup.group, dropoff.group);
  const routeRecord = routeId
    ? MASTER_FARE_CONFIG.routes.find(record => record.active && record.id === routeId)
    : undefined;
  const fareScheme = exactSpecial ? "standard" : routeRecord?.bracketScheme ?? "standard";
  const allocations = allocatePassengers(input.passengerCount, numberBuses);
  const busBreakdown = fareScheme === "paramin"
    ? allocations.map((passengers, index) => ({
        bus: index + 1,
        passengerCount: passengers,
        bracket: bracket as ParaminPassengerBracket,
        fare: routeRecord?.bracketScheme === "paramin"
          ? routeRecord.fares[input.tripType][bracket as ParaminPassengerBracket] ?? NaN
          : NaN,
      }))
    : allocations.map((passengers, index) => {
        const busBracket = passengerBracket(Math.max(1, passengers));
        return {
          bus: index + 1,
          passengerCount: passengers,
          bracket: busBracket as PassengerBracket,
          fare: exactSpecial?.fares[input.tripType][busBracket as PassengerBracket]
            ?? (routeRecord?.bracketScheme === "standard" && busBracket
              ? routeRecord.fares[input.tripType][busBracket]
              : null)
            ?? NaN,
        };
      });
  const hasMissingFare = busBreakdown.some(item => !Number.isFinite(item.fare));
  const baseFare = hasMissingFare ? null : busBreakdown.reduce((sum, item) => sum + item.fare, 0);

  if (baseFare === null || baseFare === undefined) {
    return {
      status: "custom_quote",
      message: CUSTOM_QUOTE_MESSAGE,
      routeId: routeId ?? null,
      routeLabel: routeRecord?.label ?? null,
      bracket,
      busBreakdown: [],
      rushFee: 0,
      totalFare: null,
      deposit: null,
      urgency,
    };
  }

  const rushFee = urgency === "urgent" ? input.rushFee ?? DEFAULT_FARE_SETTINGS.rushFee : 0;
  const totalFare = baseFare + rushFee;
  const depositPct = input.depositPct ?? DEFAULT_FARE_SETTINGS.depositPct;
  const deposit = Math.round(totalFare * depositPct) / 100;

  return {
    status: "approved",
    message: null,
    routeId: exactSpecial?.id ?? routeRecord!.id,
    routeLabel: exactSpecial ? exactSpecial.id : routeRecord!.label,
    bracket,
    busBreakdown,
    baseFare,
    rushFee,
    totalFare,
    deposit,
    urgency,
  };
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-TT", { minimumFractionDigits: amount % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
}