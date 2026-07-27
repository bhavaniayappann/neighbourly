import type { HouseVisitStatus, SavedHouse } from "@/types";

export interface HouseRow {
  id: string;
  user_id: string;
  address: string;
  lat: number;
  lng: number;
  status: HouseVisitStatus;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  list_price: number | null;
  offer_price: number | null;
  notes: string | null;
  neighbourhood: string | null;
  geoid: string | null;
  neighbourhood_id: string | null;
  rating: number | null;
  visit_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHouseInput {
  address: string;
  lat: number;
  lng: number;
  status?: HouseVisitStatus;
  beds?: number;
  baths?: number;
  sqft?: number;
  listPrice?: number;
  offerPrice?: number;
  notes?: string;
  neighbourhood?: string;
  geoid?: string;
  neighbourhoodId?: string | null;
  rating?: number;
  visitDate?: string;
}

export type UpdateHouseInput = Partial<CreateHouseInput>;

export function mapHouseRow(row: HouseRow): SavedHouse {
  return {
    id: row.id,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    ...(row.beds != null ? { beds: row.beds } : {}),
    ...(row.baths != null ? { baths: Number(row.baths) } : {}),
    ...(row.sqft != null ? { sqft: row.sqft } : {}),
    ...(row.list_price != null ? { listPrice: row.list_price } : {}),
    ...(row.offer_price != null ? { offerPrice: row.offer_price } : {}),
    ...(row.notes != null ? { notes: row.notes } : {}),
    ...(row.neighbourhood != null ? { neighbourhood: row.neighbourhood } : {}),
    ...(row.geoid != null ? { geoid: row.geoid } : {}),
    neighbourhoodId: row.neighbourhood_id,
    ...(row.rating != null ? { rating: row.rating } : {}),
    ...(row.visit_date != null ? { visitDate: row.visit_date } : {}),
  };
}

function toDbFields(
  input: CreateHouseInput | UpdateHouseInput
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if ("address" in input && input.address !== undefined) {
    fields.address = input.address;
  }
  if ("lat" in input && input.lat !== undefined) fields.lat = input.lat;
  if ("lng" in input && input.lng !== undefined) fields.lng = input.lng;
  if ("status" in input && input.status !== undefined) {
    fields.status = input.status;
  }
  if ("beds" in input) fields.beds = input.beds ?? null;
  if ("baths" in input) fields.baths = input.baths ?? null;
  if ("sqft" in input) fields.sqft = input.sqft ?? null;
  if ("listPrice" in input) fields.list_price = input.listPrice ?? null;
  if ("offerPrice" in input) fields.offer_price = input.offerPrice ?? null;
  if ("notes" in input) fields.notes = input.notes ?? null;
  if ("neighbourhood" in input) {
    fields.neighbourhood = input.neighbourhood ?? null;
  }
  if ("geoid" in input) fields.geoid = input.geoid ?? null;
  if ("neighbourhoodId" in input) {
    fields.neighbourhood_id = input.neighbourhoodId ?? null;
  }
  if ("rating" in input) fields.rating = input.rating ?? null;
  if ("visitDate" in input) fields.visit_date = input.visitDate ?? null;

  return fields;
}

export function mapHouseInsert(
  input: CreateHouseInput,
  userId: string
): Record<string, unknown> {
  return {
    user_id: userId,
    ...toDbFields(input),
  };
}

export function mapHouseUpdate(input: UpdateHouseInput): Record<string, unknown> {
  return toDbFields(input);
}

const HOUSE_STATUSES: HouseVisitStatus[] = ["visited", "planned"];

export function isHouseVisitStatus(value: unknown): value is HouseVisitStatus {
  return typeof value === "string" && HOUSE_STATUSES.includes(value as HouseVisitStatus);
}

export function parseCreateHouseInput(body: unknown): CreateHouseInput | string {
  if (!body || typeof body !== "object") {
    return "Invalid request body";
  }

  const data = body as Record<string, unknown>;

  if (typeof data.address !== "string" || !data.address.trim()) {
    return "address is required";
  }
  if (typeof data.lat !== "number" || typeof data.lng !== "number") {
    return "lat and lng are required";
  }
  if (data.status !== undefined && !isHouseVisitStatus(data.status)) {
    return "status must be visited or planned";
  }
  if (
    data.rating !== undefined &&
    data.rating !== null &&
    (typeof data.rating !== "number" || data.rating < 1 || data.rating > 5)
  ) {
    return "rating must be between 1 and 5";
  }

  return {
    address: data.address.trim(),
    lat: data.lat,
    lng: data.lng,
    ...(isHouseVisitStatus(data.status) ? { status: data.status } : {}),
    ...(typeof data.beds === "number" ? { beds: data.beds } : {}),
    ...(typeof data.baths === "number" ? { baths: data.baths } : {}),
    ...(typeof data.sqft === "number" ? { sqft: data.sqft } : {}),
    ...(typeof data.listPrice === "number" ? { listPrice: data.listPrice } : {}),
    ...(typeof data.offerPrice === "number" ? { offerPrice: data.offerPrice } : {}),
    ...(typeof data.notes === "string" ? { notes: data.notes } : {}),
    ...(typeof data.neighbourhood === "string"
      ? { neighbourhood: data.neighbourhood }
      : {}),
    ...(typeof data.geoid === "string" ? { geoid: data.geoid } : {}),
    ...(data.neighbourhoodId === null || typeof data.neighbourhoodId === "string"
      ? { neighbourhoodId: data.neighbourhoodId as string | null }
      : {}),
    ...(typeof data.rating === "number" ? { rating: data.rating } : {}),
    ...(typeof data.visitDate === "string" ? { visitDate: data.visitDate } : {}),
  };
}

export function parseUpdateHouseInput(body: unknown): UpdateHouseInput | string {
  if (!body || typeof body !== "object") {
    return "Invalid request body";
  }

  const data = body as Record<string, unknown>;

  if (data.status !== undefined && !isHouseVisitStatus(data.status)) {
    return "status must be visited or planned";
  }
  if (
    data.rating !== undefined &&
    data.rating !== null &&
    (typeof data.rating !== "number" || data.rating < 1 || data.rating > 5)
  ) {
    return "rating must be between 1 and 5";
  }

  const input: UpdateHouseInput = {};

  if (typeof data.address === "string") input.address = data.address.trim();
  if (typeof data.lat === "number") input.lat = data.lat;
  if (typeof data.lng === "number") input.lng = data.lng;
  if (isHouseVisitStatus(data.status)) input.status = data.status;
  if ("beds" in data) input.beds = typeof data.beds === "number" ? data.beds : undefined;
  if ("baths" in data) {
    input.baths = typeof data.baths === "number" ? data.baths : undefined;
  }
  if ("sqft" in data) input.sqft = typeof data.sqft === "number" ? data.sqft : undefined;
  if ("listPrice" in data) {
    input.listPrice = typeof data.listPrice === "number" ? data.listPrice : undefined;
  }
  if ("offerPrice" in data) {
    input.offerPrice =
      typeof data.offerPrice === "number" ? data.offerPrice : undefined;
  }
  if ("notes" in data) {
    input.notes = typeof data.notes === "string" ? data.notes : undefined;
  }
  if ("neighbourhood" in data) {
    input.neighbourhood =
      typeof data.neighbourhood === "string" ? data.neighbourhood : undefined;
  }
  if ("geoid" in data) {
    input.geoid = typeof data.geoid === "string" ? data.geoid : undefined;
  }
  if ("neighbourhoodId" in data) {
    input.neighbourhoodId =
      data.neighbourhoodId === null || typeof data.neighbourhoodId === "string"
        ? data.neighbourhoodId
        : undefined;
  }
  if ("rating" in data) {
    input.rating = typeof data.rating === "number" ? data.rating : undefined;
  }
  if ("visitDate" in data) {
    input.visitDate = typeof data.visitDate === "string" ? data.visitDate : undefined;
  }

  if (Object.keys(input).length === 0) {
    return "No valid fields to update";
  }

  return input;
}
