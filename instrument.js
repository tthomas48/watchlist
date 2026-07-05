const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

module.exports = { Sentry, useSentry: Boolean(process.env.SENTRY_DSN) };
