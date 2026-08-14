import test from 'node:test'; import assert from 'node:assert/strict';
import { evaluateSourceHealth,healthIssueFor } from '../src/services/sourceHealth.js';
test('distinguishes healthy no-activity from a stale source',()=>{const now=new Date('2026-08-14T12:00:00Z');assert.equal(evaluateSourceHealth({lastSuccess:'2026-08-14T08:00:00Z',freshnessHours:24},now).healthy,true);assert.equal(evaluateSourceHealth({id:'x',name:'בנק',lastSuccess:'2026-08-10T08:00:00Z',freshnessHours:24},now).status,'stale')});
test('creates one deduplicatable health issue',()=>{const issue=healthIssueFor({id:'phone-a',name:'טלפון א׳',lastSuccess:'2026-08-01T00:00:00Z',freshnessHours:24},new Date('2026-08-14T00:00:00Z'));assert.equal(issue.dedupeKey,'source-health:phone-a:stale')});
