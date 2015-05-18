import http from 'http';
import express from 'express';

var router = require('./router');

const app = express();
app.use('/', router);

export const application = app;
export const server = http.createServer(app);

