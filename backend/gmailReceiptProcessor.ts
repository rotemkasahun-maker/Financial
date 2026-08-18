import { processReceiptPdf } from './receiptProcessingService.ts';

const SUPPORTED_AUTOMATIC_TYPES = new Set([
  'application/pdf'
]);

const MAX_DOCUMENT_BYTES =
  15 * 1024 * 1024;

export type GmailReceiptAttachment = {
  id: string;
  mimeType?: string | null;
  filename?: string | null;
};

export type GmailReceiptEvidence = {
  messageId: string;
  threadId?: string | null;
  subject?: string | null;
  from?: string | null;
  receivedAt?: string | null;
  attachmentIds?: GmailReceiptAttachment[];
  documentUrls?: string[];
};

export type GmailReceiptProcessingResult =
  | {
      status: 'processed';
      attachmentId?: string;
      documentUrl?: string;
      filename: string;
      receipt: Awaited<
        ReturnType<typeof processReceiptPdf>
      >;
    }
  | {
      status: 'review_required';
      reason: string;
      attachmentId?: string;
      documentUrl?: string;
      filename?: string;
      receipt?: Awaited<
        ReturnType<typeof processReceiptPdf>
      >;
    }
  | {
      status: 'no_automatic_document';
      reason: string;
    };

type GmailReceiptProcessorOptions = {
  gmail: {
    getAttachment: (
      connection: unknown,
      messageId: string,
      attachmentId: string
    ) => Promise<any>;
  };

  processPdf?: typeof processReceiptPdf;

  fetchDocument?: (
    url: string,
    options?: RequestInit
  ) => Promise<any>;
};

export class GmailReceiptProcessor {
  gmail: GmailReceiptProcessorOptions['gmail'];
  processPdf: typeof processReceiptPdf;
  fetchDocument: NonNullable<
    GmailReceiptProcessorOptions['fetchDocument']
  >;

  constructor({
    gmail,
    processPdf = processReceiptPdf,
    fetchDocument = globalThis.fetch
  }: GmailReceiptProcessorOptions) {
    this.gmail = gmail;
    this.processPdf = processPdf;
    this.fetchDocument = fetchDocument;
  }

  async process(
    connection: any,
    evidence: GmailReceiptEvidence
  ): Promise<GmailReceiptProcessingResult> {
    if (!connection) {
      throw new TypeError(
        'GmailReceiptProcessor requires a Gmail connection'
      );
    }

    if (!evidence?.messageId) {
      throw new TypeError(
        'GmailReceiptProcessor requires a messageId'
      );
    }

    const attachments =
      evidence.attachmentIds ?? [];

    const pdfAttachment =
      attachments.find(item =>
        SUPPORTED_AUTOMATIC_TYPES.has(
          normalizeContentType(
            item.mimeType
          )
        )
      );

    if (pdfAttachment) {
      return this.processAttachment(
        connection,
        evidence,
        pdfAttachment
      );
    }

    /*
     * Images remain staged for now.
     * Linked documents are attempted only
     * when there is no directly attached PDF.
     */
    if (
      attachments.length > 0 &&
      !evidence.documentUrls?.length
    ) {
      return {
        status: 'no_automatic_document',
        reason:
          'automatic_image_processing_not_enabled'
      };
    }

    const documentUrls =
      evidence.documentUrls ?? [];

    for (
      const documentUrl of documentUrls
    ) {
      if (
        !isSafeDocumentUrl(
          documentUrl
        )
      ) {
        continue;
      }

      const result =
        await this.processDocumentUrl(
          documentUrl
        );

      /*
       * Try another candidate URL only when
       * this URL clearly was not the document.
       */
      if (
        result.status ===
          'no_automatic_document'
      ) {
        continue;
      }

      return result;
    }

    if (
      documentUrls.length > 0
    ) {
      return {
        status: 'review_required',
        reason:
          'no_safe_downloadable_document'
      };
    }

    return {
      status: 'no_automatic_document',
      reason:
        'no_supported_attachment'
    };
  }

  private async processAttachment(
    connection: any,
    evidence: GmailReceiptEvidence,
    attachment: GmailReceiptAttachment
  ): Promise<GmailReceiptProcessingResult> {
    let attachmentResult: any;

    try {
      attachmentResult =
        await this.gmail.getAttachment(
          connection,
          evidence.messageId,
          attachment.id
        );
    } catch {
      return {
        status: 'review_required',
        reason:
          'attachment_download_failed',
        attachmentId:
          attachment.id,
        filename:
          attachment.filename ||
          'gmail-receipt.pdf'
      };
    }

    const encoded =
      attachmentResult?.response?.data ||
      '';

    if (!encoded) {
      return {
        status: 'review_required',
        reason:
          'empty_attachment',
        attachmentId:
          attachment.id,
        filename:
          attachment.filename ||
          'gmail-receipt.pdf'
      };
    }

    let bytes: Uint8Array;

    try {
      bytes =
        new Uint8Array(
          Buffer.from(
            encoded,
            'base64url'
          )
        );
    } catch {
      return {
        status: 'review_required',
        reason:
          'invalid_attachment_encoding',
        attachmentId:
          attachment.id,
        filename:
          attachment.filename ||
          'gmail-receipt.pdf'
      };
    }

    if (
      bytes.length === 0 ||
      bytes.length >
        MAX_DOCUMENT_BYTES
    ) {
      return {
        status: 'review_required',
        reason:
          'invalid_document_size',
        attachmentId:
          attachment.id,
        filename:
          attachment.filename ||
          'gmail-receipt.pdf'
      };
    }

    const filename =
      attachment.filename ||
      'gmail-receipt.pdf';

    return this.processPdfBytes({
      bytes,
      filename,
      attachmentId:
        attachment.id
    });
  }

  private async processDocumentUrl(
    documentUrl: string
  ): Promise<GmailReceiptProcessingResult> {
    let response: any;

    try {
      response =
        await this.fetchDocument(
          documentUrl,
          {
            redirect: 'manual',
            credentials: 'omit',
            headers: {
              Accept:
                'application/pdf,application/octet-stream;q=0.9,*/*;q=0.1'
            }
          }
        );
    } catch {
      return {
        status: 'review_required',
        reason:
          'document_download_failed',
        documentUrl
      };
    }

    if (
      [401, 403].includes(
        response?.status
      )
    ) {
      return {
        status: 'review_required',
        reason:
          'document_authentication_required',
        documentUrl
      };
    }

    if (
      response?.status >= 300 &&
      response?.status < 400
    ) {
      const location =
        header(
          response,
          'location'
        );

      if (!location) {
        return {
          status:
            'review_required',
          reason:
            'document_redirect_missing_location',
          documentUrl
        };
      }

      let redirectedUrl: string;

      try {
        redirectedUrl =
          new URL(
            location,
            documentUrl
          ).toString();
      } catch {
        return {
          status:
            'review_required',
          reason:
            'unsafe_document_redirect',
          documentUrl
        };
      }

      if (
        !isSafeDocumentUrl(
          redirectedUrl
        )
      ) {
        return {
          status:
            'review_required',
          reason:
            'unsafe_document_redirect',
          documentUrl
        };
      }

      try {
        response =
          await this.fetchDocument(
            redirectedUrl,
            {
              redirect:
                'manual',
              credentials:
                'omit',
              headers: {
                Accept:
                  'application/pdf,application/octet-stream;q=0.9,*/*;q=0.1'
              }
            }
          );
      } catch {
        return {
          status:
            'review_required',
          reason:
            'document_download_failed',
          documentUrl:
            redirectedUrl
        };
      }

      if (
        response?.status >= 300 &&
        response?.status < 400
      ) {
        return {
          status:
            'review_required',
          reason:
            'too_many_document_redirects',
          documentUrl:
            redirectedUrl
        };
      }

      documentUrl =
        redirectedUrl;
    }

    if (!response?.ok) {
      return {
        status: 'review_required',
        reason:
          'document_download_failed',
        documentUrl
      };
    }

    if (
      response.url &&
      !isSafeDocumentUrl(
        response.url
      )
    ) {
      return {
        status: 'review_required',
        reason:
          'unsafe_document_redirect',
        documentUrl
      };
    }

    const contentType =
      normalizeContentType(
        header(
          response,
          'content-type'
        )
      );

    const declaredSize =
      Number(
        header(
          response,
          'content-length'
        ) || 0
      );

    if (
      declaredSize >
      MAX_DOCUMENT_BYTES
    ) {
      return {
        status: 'review_required',
        reason:
          'document_too_large',
        documentUrl
      };
    }

    /*
     * Login pages and landing pages must never
     * be passed to PDF processing.
     */
    if (
      contentType ===
        'text/html'
    ) {
      return {
        status: 'review_required',
        reason:
          'document_authentication_or_landing_page',
        documentUrl
      };
    }

    if (
      contentType &&
      contentType !==
        'application/pdf' &&
      contentType !==
        'application/octet-stream'
    ) {
      return {
        status:
          'no_automatic_document',
        reason:
          'linked_document_is_not_pdf'
      };
    }

    let bytes: Uint8Array;

    try {
      bytes =
        new Uint8Array(
          await response.arrayBuffer()
        );
    } catch {
      return {
        status: 'review_required',
        reason:
          'document_download_failed',
        documentUrl
      };
    }

    if (
      bytes.length === 0 ||
      bytes.length >
        MAX_DOCUMENT_BYTES
    ) {
      return {
        status: 'review_required',
        reason:
          'invalid_document_size',
        documentUrl
      };
    }

    /*
     * Some document services use
     * application/octet-stream.
     * Confirm PDF magic bytes before processing.
     */
    if (
      !looksLikePdf(bytes)
    ) {
      return {
        status:
          'no_automatic_document',
        reason:
          'linked_document_is_not_pdf'
      };
    }

    const filename =
      filenameFromUrl(
        documentUrl
      );

    return this.processPdfBytes({
      bytes,
      filename,
      documentUrl
    });
  }

  private async processPdfBytes({
    bytes,
    filename,
    attachmentId,
    documentUrl
  }: {
    bytes: Uint8Array;
    filename: string;
    attachmentId?: string;
    documentUrl?: string;
  }): Promise<GmailReceiptProcessingResult> {
    const receipt =
      await this.processPdf(
        bytes
      );

    if (
      receipt.status !==
      'ready_for_automatic_save'
    ) {
      return {
        status: 'review_required',

        reason:
          receipt.status ===
          'processing_failed'
            ? 'receipt_processing_failed'
            : 'receipt_validation_required',

        attachmentId,
        documentUrl,
        filename,
        receipt
      };
    }

    return {
      status: 'processed',
      attachmentId,
      documentUrl,
      filename,
      receipt
    };
  }
}

function normalizeContentType(
  value: unknown
) {
  return String(value || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
}

function header(
  response: any,
  name: string
) {
  return (
    response?.headers?.get?.(
      name
    ) ||
    response?.headers?.[
      name
    ] ||
    response?.headers?.[
      name.toLowerCase()
    ] ||
    ''
  );
}

function looksLikePdf(
  bytes: Uint8Array
) {
  if (bytes.length < 5) {
    return false;
  }

  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function filenameFromUrl(
  value: string
) {
  try {
    const url =
      new URL(value);

    const name =
      url.pathname
        .split('/')
        .filter(Boolean)
        .at(-1);

    if (
      name &&
      /\.pdf$/i.test(name)
    ) {
      return name;
    }
  } catch {
    // fall through
  }

  return 'gmail-linked-receipt.pdf';
}

export function isSafeDocumentUrl(
  value: string
) {
  try {
    const url =
      new URL(value);

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password
    ) {
      return false;
    }

    const host =
      url.hostname
        .toLowerCase()
        .replace(
          /^\[|\]$/g,
          ''
        );

    if (
      host ===
        'localhost' ||
      host.endsWith(
        '.localhost'
      ) ||
      host.endsWith(
        '.local'
      ) ||
      host === '0.0.0.0' ||
      host === '::1'
    ) {
      return false;
    }

    const ipv4 =
      host
        .split('.')
        .map(Number);

    if (
      ipv4.length === 4 &&
      ipv4.every(part =>
        Number.isInteger(part)
      )
    ) {
      const [
        a,
        b
      ] = ipv4;

      if (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (
          a === 169 &&
          b === 254
        ) ||
        (
          a === 192 &&
          b === 168
        ) ||
        (
          a === 172 &&
          b >= 16 &&
          b <= 31
        )
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}