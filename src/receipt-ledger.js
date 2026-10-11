import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { canonicalize, sha256 } from './canonical.js';

export class ReceiptLedger {
  constructor({ filePath = null, clock = () => new Date().toISOString() } = {}) {
    this.filePath = filePath;
    this.clock = clock;
    this.previousHash = 'GENESIS';
    this.receipts = [];
  }

  async record(event) {
    const body = {
      schema: 'genesis.boundary.receipt.v1',
      sequence: this.receipts.length + 1,
      timestamp: this.clock(),
      previous_hash: this.previousHash,
      ...event
    };
    const receipt = { ...body, receipt_hash: sha256(canonicalize(body)) };
    this.previousHash = receipt.receipt_hash;
    this.receipts.push(receipt);
    if (this.filePath) {
      await mkdir(dirname(this.filePath), { recursive: true });
      await appendFile(this.filePath, `${canonicalize(receipt)}\n`, { encoding: 'utf8', mode: 0o600 });
    }
    return receipt;
  }
}

export function verifyReceiptChain(receipts) {
  let previousHash = 'GENESIS';
  for (let index = 0; index < receipts.length; index += 1) {
    const { receipt_hash: claimedHash, ...body } = receipts[index];
    if (body.sequence !== index + 1 || body.previous_hash !== previousHash || sha256(canonicalize(body)) !== claimedHash) {
      return false;
    }
    previousHash = claimedHash;
  }
  return true;
}
