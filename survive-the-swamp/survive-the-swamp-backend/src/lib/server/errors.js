export class BackendConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "BackendConfigError";
  }
}

export class DatabaseError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "DatabaseError";
    this.details = details;
  }
}
