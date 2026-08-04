import 'server-only';

import { randomBytes } from 'node:crypto';

export function createTransactionCode() {
  return `PD${randomBytes(5).toString('hex').toUpperCase()}`;
}

