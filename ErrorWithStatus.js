class ErrorWithStatus extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ErrorWithStatus';
  }
}

module.exports = ErrorWithStatus;
