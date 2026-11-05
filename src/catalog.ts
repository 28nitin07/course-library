import { Effect, Schema } from 'effect';
declare const __CATALOG_VERSION__: string;
const Entity = Schema.Struct({ id: Schema.String, name: Schema.String });
const Resource = Schema.Struct({ name: Schema.String, folder: Schema.String, type: Schema.String, size: Schema.Number, url: Schema.String, backupUrl: Schema.optional(Schema.String) });
const Offering = Schema.Struct({ id: Schema.String, semesterId: Schema.String, section: Schema.String, professorIds: Schema.Array(Schema.String), files: Schema.Array(Resource) });
const Course = Schema.Struct({ id: Schema.String, title: Schema.String, description: Schema.String, listings: Schema.Array(Schema.Struct({ departmentId: Schema.String, code: Schema.String })), majorIds: Schema.Array(Schema.String), sharedFiles: Schema.Array(Resource), offerings: Schema.Array(Offering) });
export const Catalog = Schema.Struct({ departments: Schema.Array(Entity), majors: Schema.Array(Entity), semesters: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String, order: Schema.Number })), professors: Schema.Array(Entity), courses: Schema.Array(Course) });
export type Catalog = typeof Catalog.Type;
export type Course = typeof Course.Type;
export type Offering = typeof Offering.Type;
export type Resource = typeof Resource.Type;
export const loadCatalog = Effect.gen(function* () {
  const response = yield* Effect.tryPromise({ try: () => fetch(`${import.meta.env.BASE_URL}catalog.json?v=${__CATALOG_VERSION__}`), catch: () => new Error('Unable to connect. Check your connection and try again.') });
  if (!response.ok) return yield* Effect.fail(new Error('The catalog could not be loaded. Please try again.'));
  const data = yield* Effect.tryPromise({ try: () => response.json() as Promise<unknown>, catch: () => new Error('The catalog could not be read.') });
  return yield* Schema.decodeUnknown(Catalog)(data).pipe(Effect.mapError(() => new Error('The catalog has an invalid format. Please rebuild the site.')));
});
