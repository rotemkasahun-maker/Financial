import {
  LocalFileBlobStore,
  GcsBlobStore
} from './storage.ts';

import {
  decryptJson,
  encryptJson
} from './crypto.ts';

export type FinanceState = {
  version: number;
  transactions: any[];
  receipts: any[];
  idempotency: Record<string, any>;
  tasks: any[];
  expectedDocuments: any[];
  rewardEvents: Record<string, any>;
};

export const emptyFinanceState = (): FinanceState => ({
  version: 1,
  transactions: [],
  receipts: []
  ,idempotency: {}, tasks: [], expectedDocuments: [], rewardEvents: {}
});

export class FinanceStateRepository {
  blobStore: {
    read(): Promise<Buffer | null>;
    write(value: Buffer): Promise<void>;
  };

  encryptionKey: string;

  constructor({
    blobStore,
    encryptionKey
  }: {
    blobStore: {
      read(): Promise<Buffer | null>;
      write(value: Buffer): Promise<void>;
    };
    encryptionKey: string;
  }) {
    this.blobStore = blobStore;
    this.encryptionKey = encryptionKey;
  }

  async read(): Promise<FinanceState> {
    const bytes =
      await this.blobStore.read();

    if (!bytes) {
      return emptyFinanceState();
    }

    const state =
      decryptJson(
        bytes,
        this.encryptionKey
      );

    return normalizeFinanceState(
      state
    );
  }

  async write(
    state: FinanceState
  ): Promise<void> {
    const normalized =
      normalizeFinanceState(state);

    await this.blobStore.write(
      encryptJson(
        normalized,
        this.encryptionKey
      )
    );
  }

  async update<T>(
    mutator: (
      state: FinanceState
    ) => Promise<T> | T
  ): Promise<T> {
    const state =
      await this.read();

    const result =
      await mutator(state);

    await this.write(state);

    return result;
  }
}

function normalizeFinanceState(
  value: any
): FinanceState {
  return {
    version:
      Number(value?.version) || 1,

    transactions:
      Array.isArray(
        value?.transactions
      )
        ? value.transactions
        : [],

    receipts:
      Array.isArray(
        value?.receipts
      )
        ? value.receipts
        : []
    ,idempotency: value?.idempotency && typeof value.idempotency === 'object' ? value.idempotency : {},
    tasks: Array.isArray(value?.tasks) ? value.tasks : [],
    expectedDocuments: Array.isArray(value?.expectedDocuments) ? value.expectedDocuments : [],
    rewardEvents: value?.rewardEvents && typeof value.rewardEvents === 'object' ? value.rewardEvents : {}
  };
}

export function createFinanceStateRepository(
  config: any
) {
  if (
    !config?.stateEncryptionKey
  ) {
    throw new Error(
      'STATE_ENCRYPTION_KEY is required for finance storage'
    );
  }

  const blobStore =
    config.financeStateBucket
      ? new GcsBlobStore({
          bucket:
            config.financeStateBucket,
          object:
            config.financeStateObject
        })
      : new LocalFileBlobStore(
          config.financeStateFile
        );

  return new FinanceStateRepository({
    blobStore,
    encryptionKey:
      config.stateEncryptionKey
  });
}
