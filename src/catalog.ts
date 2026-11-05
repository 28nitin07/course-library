import { Effect, Schema } from 'effect';

const Resource = Schema.Struct({ name: Schema.String, folder: Schema.String, type: Schema.String, size: Schema.Number, url: Schema.String });
const Course = Schema.Struct({ id: Schema.String, title: Schema.String, description: Schema.String, category: Schema.String, files: Schema.Array(Resource) });
export const Catalog = Schema.Struct({ courses: Schema.Array(Course) });
export type Course = typeof Course.Type;
export type Resource = typeof Resource.Type;

export const loadCatalog = Effect.gen(function* () {
  const response = yield* Effect.tryPromise({ try: () => fetch(`${import.meta.env.BASE_URL}catalog.json`), catch: () => new Error('Unable to connect to the library. Check your connection and try again.') });
  if (!response.ok) return yield* Effect.fail(new Error('The course catalog could not be loaded. Please try again.'));
  const data = yield* Effect.tryPromise({ try: () => response.json() as Promise<unknown>, catch: () => new Error('The course catalog could not be read.') });
  return yield* Schema.decodeUnknown(Catalog)(data).pipe(Effect.mapError(() => new Error('The course catalog has an invalid format. Please rebuild the site.')));
});
