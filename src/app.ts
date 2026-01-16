import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import Logger from '@service/logger';
import errorHandler from '@middleware/errorHandler';
import appRoute from '@routes/app.route';
import Vars from '@config/var';

const app = express();

app.use(
  morgan(':method :url Status: :status, Time taken: :response-time ms', {
    stream: { write: (message) => Logger.info(message) },
  })
);

app.use(cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const serverStartTimeStamp = new Date().toISOString();

app.get('/ping', (_req, res) => {
  res.status(200).send('pong');
});

app.get('/status', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    version: Vars.version,
    startTime: serverStartTimeStamp,
    service: Vars.serviceName,
  });
});

app.use('/api', appRoute);

app.use(errorHandler);

export default app;