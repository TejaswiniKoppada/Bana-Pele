export class ApiError extends Error {
  constructor(message, { statusCode, responseCode } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseCode = responseCode;
  }
}
