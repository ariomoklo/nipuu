import type { FieldSchema } from '$lib/server/model/types';

class SchemaStore {
  private schemas: Map<string, FieldSchema> = new Map();

  /** get schema by key. <table>.<field> */
  get(key: string): FieldSchema | undefined {
    return this.schemas.get(key);
  }

  /** add schema to store. <table>.<field> */
  add(key: string, schema: FieldSchema): void {
    this.schemas.set(key, schema);
  }

  clear(): void {
    this.schemas.clear();
  }
}

export default new SchemaStore();
