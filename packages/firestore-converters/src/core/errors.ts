export class ConverterError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = "ConverterError";
  }
}

export class MissingSchemaVersionError extends ConverterError {
  constructor(documentData: unknown) {
    super("Document is missing _schemaVersion.", { documentData });
    this.name = "MissingSchemaVersionError";
  }
}

export class UnsupportedSchemaVersionError extends ConverterError {
  constructor(version: number, currentVersion: number) {
    super("Document schema version is not supported by this runtime.", {
      version,
      currentVersion,
    });
    this.name = "UnsupportedSchemaVersionError";
  }
}

export class MissingSchemaTransformError extends ConverterError {
  constructor(fromVersion: number, toVersion: number) {
    super("Schema transform is missing for required version step.", {
      fromVersion,
      toVersion,
    });
    this.name = "MissingSchemaTransformError";
  }
}

export class SchemaValidationError extends ConverterError {
  constructor(message: string, details: unknown) {
    super(message, { details });
    this.name = "SchemaValidationError";
  }
}
