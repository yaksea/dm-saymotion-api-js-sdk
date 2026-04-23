export class SaymotionError extends Error {
  constructor(message: string, public rid?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthenticationError extends SaymotionError {
  constructor(message: string) {
    super(message);
  }
}

export class APIError extends SaymotionError {
  constructor(message: string, public status_code?: number, rid?: string) {
    super(message, rid);
  }
}

export class ValidationError extends SaymotionError {
  constructor(message: string) {
    super(message);
  }
}

export class TimeoutError extends SaymotionError {
  constructor(message: string, rid?: string) {
    super(message, rid);
  }
}
