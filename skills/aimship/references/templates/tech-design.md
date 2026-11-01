# tech-design

Delivery: <deliveryId from init>; document revision: <revision>.

## 1. Basis and engineering context

Current requirements and actual engineering constraints. Replace guidance with actual content; explain inapplicability, never prefill a result.

## 2. Architecture and key flows

Ordered explanation, with a concise diagram when useful to show cross-system calls, transaction boundaries and cache/response order. Replace guidance with actual content; explain inapplicability, never prefill a result.

## 3. Modules and interaction implementation

Repository ID, responsibility, actual path, new/change and requirement refs. For a full-stack change use readable backend/frontend subsections: affected service/data responsibilities; client pages/routes, reused/new components, interaction states and data flow. For other tasks organize by the actual components; do not invent unused frontend/backend sections. Replace guidance with actual content; explain inapplicability, never prefill a result.

## 4. Data, interfaces and SQL

Structures, indexes, consistency constraints and their decision time/enforcement boundary/remaining windows, contract authority, database type/version/schema basis, SQL order and execution boundary. Replace guidance with actual content; explain inapplicability, never prefill a result.

## 5. Errors and nonfunctional design

Recovery, access, performance, observability, cache/messages when relevant. For critical-path changes, show call placement/count, timeout/failure behavior, cost basis and a suitable verification method; distinguish facts, estimates and unknowns. Replace guidance with actual content; explain inapplicability, never prefill a result.

## 6. Tradeoffs and risks

Reasons, meaningful alternatives, compatibility and remaining risks. Keep business guarantees distinct from product exclusions; explain any unresolved meaning as a concrete question. Replace guidance with actual content; explain inapplicability, never prefill a result.

## 7. Requirement coverage and questions

REQ/AC to module/operation/SQL section. For unresolved business or technical questions, state the impact, recommendation and latest point needing an answer. Review these with the document; carry forward questions that do not affect the next work. Replace guidance with actual content; explain inapplicability, never prefill a result.

<!-- Review guidance: retain the fixed outline. Technical design precedes interface/SQL production; test cases precede planning. Self-check and explicit document approval are separate from stage done. For plan/testing, keep execution records after execution/runs respectively. -->
