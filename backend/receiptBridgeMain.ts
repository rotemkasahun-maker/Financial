import { createServer } from 'node:http';
import { loadConfig } from './config.ts';
import { createFinanceStateRepository } from './financeStorage.ts';
import { createReceiptBridgeHandler } from './receiptBridgeServer.ts';

const config = loadConfig();
const repository = createFinanceStateRepository({ ...config, stateBucket: config.financeStateBucket, stateObject: config.financeStateObject, encryptionKey: config.stateEncryptionKey });
const handler = createReceiptBridgeHandler({ stateReader: () => repository.read() });
const port = Number(process.env.PORT || 8080);
createServer(handler).listen(port, '0.0.0.0', () => console.log(`receipt bridge listening on ${port}`));
