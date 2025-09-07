import session, { SessionOptions } from 'express-session';

const DAY_MS = 24 * 60 * 60 * 1000;

const options: SessionOptions = {
  secret: process.env.SESSION_SECRET || 'dev-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DAY_MS,
  },
};

export const sessionMiddleware = session(options);

