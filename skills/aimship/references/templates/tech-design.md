# tech-design

Delivery: <deliveryId from init>; document revision: <revision>.

## Basis and engineering context

Current requirements and actual engineering constraints. Replace guidance with actual content; explain inapplicability, never prefill a result.

## Architecture and key flows

Ordered explanation, with a concise diagram when useful to show cross-system calls, transaction boundaries and cache/response order. Replace guidance with actual content; explain inapplicability, never prefill a result.

## Modules and interaction implementation

Repository ID, responsibility, actual path, new/change, requirement refs; entry/state/data flow and component reuse for affected interaction. Replace guidance with actual content; explain inapplicability, never prefill a result.

## Data, interfaces and SQL

Structures, indexes, consistency constraints and their decision time/enforcement boundary/remaining windows, contract authority, database type/version/schema basis, SQL order and execution boundary. Replace guidance with actual content; explain inapplicability, never prefill a result.

## Errors and nonfunctional design

Recovery, access, performance, observability, cache/messages when relevant. For critical-path changes, show call placement/count, timeout/failure behavior, cost basis and a suitable verification method; distinguish facts, estimates and unknowns. Replace guidance with actual content; explain inapplicability, never prefill a result.

## Tradeoffs and risks

Reasons, meaningful alternatives, compatibility and remaining risks. Keep business guarantees distinct from product exclusions; explain any unresolved meaning as a concrete question. Replace guidance with actual content; explain inapplicability, never prefill a result.

## Requirement coverage and questions

REQ/AC to module/operation/SQL section and unresolved Q. Replace guidance with actual content; explain inapplicability, never prefill a result.

<!-- Review guidance: retain the fixed outline. Technical design precedes interface/SQL production; test cases precede planning. Self-check and explicit document approval are separate from stage done. For plan/testing, keep execution records after execution/runs respectively. -->
