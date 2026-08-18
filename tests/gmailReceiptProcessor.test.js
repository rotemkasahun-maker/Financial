import test from 'node:test';
import assert from 'node:assert/strict';

import {
    GmailReceiptProcessor,
    isSafeDocumentUrl
} from '../backend/gmailReceiptProcessor.ts';

const connection = {
    id: 'primary',
    email: 'family@example.test'
};

const pdfEvidence = {
    messageId: 'message-123',
    subject: 'חשבונית',
    attachmentIds: [
        {
            id: 'attachment-456',
            mimeType: 'application/pdf',
            filename: 'receipt.pdf'
        }
    ],
    documentUrls: []
};

const linkedEvidence = {
    messageId: 'message-linked',
    subject: 'החשבונית שלך',
    attachmentIds: [],
    documentUrls: [
        'https://documents.example.test/download/receipt'
    ]
};

const successfulReceipt = {
    status: 'ready_for_automatic_save',
    extraction: {
        merchant: 'Test Store',
        purchaseDate: '2026-08-18',
        total: '100.00',
        confidence: 0.97
    },
    validation: {
        valid: true,
        safeForAutomaticSave: true,
        requiresReview: false
    },
    document: {
        pageCount: 1,
        hasTextLayer: true,
        usedOcr: false,
        textLength: 100
    },
    error: null
};

const pdfResponse = ({
    status = 200,
    type = 'application/pdf',
    body = '%PDF-test',
    url =
    'https://documents.example.test/download/receipt',
    location = null
} = {}) => ({
    status,
    ok:
        status >= 200 &&
        status < 300,
    url,
    headers: {
        get(name) {
            const key =
                name.toLowerCase();

            if (
                key ===
                'content-type'
            ) {
                return type;
            }

            if (
                key ===
                'content-length'
            ) {
                return String(
                    Buffer.byteLength(
                        body
                    )
                );
            }

            if (
                key ===
                'location'
            ) {
                return location;
            }

            return null;
        }
    },
    async arrayBuffer() {
        const bytes =
            Buffer.from(body);

        return bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset +
            bytes.byteLength
        );
    }
});

test(
    'downloads Gmail PDF attachment and processes it exactly once',
    async () => {
        let downloadCalls = 0;
        let processCalls = 0;

        const gmail = {
            async getAttachment(
                receivedConnection,
                messageId,
                attachmentId
            ) {
                downloadCalls += 1;

                assert.equal(
                    receivedConnection,
                    connection
                );

                assert.equal(
                    messageId,
                    'message-123'
                );

                assert.equal(
                    attachmentId,
                    'attachment-456'
                );

                return {
                    response: {
                        data:
                            Buffer.from(
                                '%PDF-test'
                            ).toString(
                                'base64url'
                            )
                    }
                };
            }
        };

        const processor =
            new GmailReceiptProcessor({
                gmail,

                processPdf:
                    async bytes => {
                        processCalls += 1;

                        assert.equal(
                            Buffer.from(
                                bytes
                            ).toString(),
                            '%PDF-test'
                        );

                        return successfulReceipt;
                    }
            });

        const result =
            await processor.process(
                connection,
                pdfEvidence
            );

        assert.equal(
            downloadCalls,
            1
        );

        assert.equal(
            processCalls,
            1
        );

        assert.equal(
            result.status,
            'processed'
        );

        assert.equal(
            result.attachmentId,
            'attachment-456'
        );

        assert.equal(
            result.filename,
            'receipt.pdf'
        );
    }
);

test(
    'safe linked PDF is downloaded and processed without Gmail attachment',
    async () => {
        let fetchCalls = 0;
        let processCalls = 0;

        const processor =
            new GmailReceiptProcessor({
                gmail: {
                    async getAttachment() {
                        throw new Error(
                            'No attachment expected'
                        );
                    }
                },

                fetchDocument:
                    async (
                        url,
                        options
                    ) => {
                        fetchCalls += 1;

                        assert.equal(
                            url,
                            linkedEvidence
                                .documentUrls[0]
                        );

                        assert.equal(
                            options.credentials,
                            'omit'
                        );

                        assert.equal(
                            options.redirect,
                            'manual'
                        );

                        return pdfResponse();
                    },

                processPdf:
                    async bytes => {
                        processCalls += 1;

                        assert.ok(
                            Buffer.from(
                                bytes
                            )
                                .toString()
                                .startsWith(
                                    '%PDF-'
                                )
                        );

                        return successfulReceipt;
                    }
            });

        const result =
            await processor.process(
                connection,
                linkedEvidence
            );

        assert.equal(
            fetchCalls,
            1
        );

        assert.equal(
            processCalls,
            1
        );

        assert.equal(
            result.status,
            'processed'
        );

        assert.equal(
            result.documentUrl,
            linkedEvidence
                .documentUrls[0]
        );
    }
);

test(
    'one safe redirect is followed before processing linked PDF',
    async () => {
        let fetchCalls = 0;

        const processor =
            new GmailReceiptProcessor({
                gmail: {
                    async getAttachment() {
                        throw new Error(
                            'No attachment expected'
                        );
                    }
                },

                fetchDocument:
                    async url => {
                        fetchCalls += 1;

                        if (
                            fetchCalls === 1
                        ) {
                            return pdfResponse({
                                status: 302,
                                type: 'text/html',
                                body: '',
                                location:
                                    'https://cdn.example.test/files/receipt.pdf',
                                url
                            });
                        }

                        assert.equal(
                            url,
                            'https://cdn.example.test/files/receipt.pdf'
                        );

                        return pdfResponse({
                            url
                        });
                    },

                processPdf:
                    async () =>
                        successfulReceipt
            });

        const result =
            await processor.process(
                connection,
                linkedEvidence
            );

        assert.equal(
            fetchCalls,
            2
        );

        assert.equal(
            result.status,
            'processed'
        );

        assert.equal(
            result.documentUrl,
            'https://cdn.example.test/files/receipt.pdf'
        );
    }
);

test(
    'HTML login or landing page requires review and never reaches PDF processing',
    async () => {
        let processCalls = 0;

        const processor =
            new GmailReceiptProcessor({
                gmail: {
                    async getAttachment() {
                        throw new Error(
                            'No attachment expected'
                        );
                    }
                },

                fetchDocument:
                    async () =>
                        pdfResponse({
                            type: 'text/html',
                            body:
                                '<html><form>login</form></html>'
                        }),

                processPdf:
                    async () => {
                        processCalls += 1;
                        return successfulReceipt;
                    }
            });

        const result =
            await processor.process(
                connection,
                linkedEvidence
            );

        assert.equal(
            processCalls,
            0
        );

        assert.equal(
            result.status,
            'review_required'
        );

        assert.equal(
            result.reason,
            'document_authentication_or_landing_page'
        );
    }
);

test(
    'unsafe linked document URL is never fetched',
    async () => {
        let fetchCalls = 0;

        const processor =
            new GmailReceiptProcessor({
                gmail: {
                    async getAttachment() {
                        throw new Error(
                            'No attachment expected'
                        );
                    }
                },

                fetchDocument:
                    async () => {
                        fetchCalls += 1;
                        return pdfResponse();
                    },

                processPdf:
                    async () =>
                        successfulReceipt
            });

        const result =
            await processor.process(
                connection,
                {
                    ...linkedEvidence,
                    documentUrls: [
                        'https://127.0.0.1/receipt.pdf'
                    ]
                }
            );

        assert.equal(
            fetchCalls,
            0
        );

        assert.equal(
            result.status,
            'review_required'
        );

        assert.equal(
            result.reason,
            'no_safe_downloadable_document'
        );
    }
);

test(
    'unsafe redirect is blocked',
    async () => {
        let processCalls = 0;

        const processor =
            new GmailReceiptProcessor({
                gmail: {
                    async getAttachment() {
                        throw new Error(
                            'No attachment expected'
                        );
                    }
                },

                fetchDocument:
                    async () =>
                        pdfResponse({
                            status: 302,
                            type: 'text/html',
                            body: '',
                            location:
                                'https://192.168.1.4/private.pdf'
                        }),

                processPdf:
                    async () => {
                        processCalls += 1;
                        return successfulReceipt;
                    }
            });

        const result =
            await processor.process(
                connection,
                linkedEvidence
            );

        assert.equal(
            processCalls,
            0
        );

        assert.equal(
            result.status,
            'review_required'
        );

        assert.equal(
            result.reason,
            'unsafe_document_redirect'
        );
    }
);

test(
    'linked response claiming PDF must actually contain PDF bytes',
    async () => {
        let processCalls = 0;

        const processor =
            new GmailReceiptProcessor({
                gmail: {
                    async getAttachment() {
                        throw new Error(
                            'No attachment expected'
                        );
                    }
                },

                fetchDocument:
                    async () =>
                        pdfResponse({
                            type:
                                'application/pdf',
                            body:
                                '<html>not pdf</html>'
                        }),

                processPdf:
                    async () => {
                        processCalls += 1;
                        return successfulReceipt;
                    }
            });

        const result =
            await processor.process(
                connection,
                linkedEvidence
            );

        assert.equal(
            processCalls,
            0
        );

        assert.equal(
            result.status,
            'review_required'
        );

        assert.equal(
            result.reason,
            'no_safe_downloadable_document'
        );
    }
);

test(
    'AI validation review result stays review required',
    async () => {
        const gmail = {
            async getAttachment() {
                return {
                    response: {
                        data:
                            Buffer.from(
                                '%PDF-review'
                            ).toString(
                                'base64url'
                            )
                    }
                };
            }
        };

        const reviewReceipt = {
            ...successfulReceipt,
            status:
                'review_required',
            validation: {
                valid: true,
                safeForAutomaticSave:
                    false,
                requiresReview: true
            }
        };

        const processor =
            new GmailReceiptProcessor({
                gmail,

                processPdf:
                    async () =>
                        reviewReceipt
            });

        const result =
            await processor.process(
                connection,
                pdfEvidence
            );

        assert.equal(
            result.status,
            'review_required'
        );

        assert.equal(
            result.reason,
            'receipt_validation_required'
        );
    }
);

test(
    'image attachment without linked document remains outside automatic PDF processing',
    async () => {
        let processCalls = 0;
        let downloadCalls = 0;

        const processor =
            new GmailReceiptProcessor({
                gmail: {
                    async getAttachment() {
                        downloadCalls += 1;

                        throw new Error(
                            'Image should not be downloaded'
                        );
                    }
                },

                processPdf:
                    async () => {
                        processCalls += 1;
                        return successfulReceipt;
                    }
            });

        const result =
            await processor.process(
                connection,
                {
                    ...pdfEvidence,

                    attachmentIds: [
                        {
                            id: 'image-1',
                            mimeType:
                                'image/jpeg',
                            filename:
                                'receipt.jpg'
                        }
                    ],

                    documentUrls: []
                }
            );

        assert.equal(
            result.status,
            'no_automatic_document'
        );

        assert.equal(
            result.reason,
            'automatic_image_processing_not_enabled'
        );

        assert.equal(
            processCalls,
            0
        );

        assert.equal(
            downloadCalls,
            0
        );
    }
);

test(
    'document URL safety blocks local private credentialed and non-HTTPS destinations',
    () => {
        assert.equal(
            isSafeDocumentUrl(
                'https://documents.example.test/receipt.pdf'
            ),
            true
        );

        for (
            const url of [
                'http://documents.example.test/receipt.pdf',
                'https://localhost/receipt.pdf',
                'https://127.0.0.1/receipt.pdf',
                'https://192.168.1.4/receipt.pdf',
                'https://169.254.169.254/latest/meta-data',
                'https://user:pass@example.test/receipt.pdf'
            ]
        ) {
            assert.equal(
                isSafeDocumentUrl(
                    url
                ),
                false,
                url
            );
        }
    }
);