# testing

Delivery: <deliveryId from init>; document revision: <revision>.

## 1. Basis and scope

Current AC and risks; adopted cases location/version if verify-only. Replace guidance with actual content; explain inapplicability, never prefill a result.

## 2. Environment, data and execution conditions

Planned tools/entry commands, isolated data, permissions and unavailable execution conditions. Actual versions/environment belong with each RUN. Replace guidance with actual content; explain inapplicability, never prefill a result.

## 3. Test cases

TC, REQ/AC or risk, type/level, preconditions, operations, concrete expected result, method/entry. Replace guidance with actual content; explain inapplicability, never prefill a result.

## 4. Coverage and verification arrangement

AC, requirements, TC, gaps and execution group/order. Explain the selected test methods from requirements and risk, reusing project checks; do not require every test category. Replace guidance with actual content; never prefill a result.

## 5. Execution and retest records

Keep formal verification RUNs and retests here, grouped by actual coverage/conditions rather than development batch: TC, testing document version, exact code/build object, environment, command/operation, assertions, result and evidence. Optionally lead with one verification-group table: Group / covered AC-TC or risk | Current state | RUN references | Uncovered work. A retest stays in the same scope with a new RUN, not a new development batch. Retain failures and later rechecks. Development checks are brief plan execution notes/evidence references; they do not replace post-overall-review verification or fill this section as formal execution. Replace guidance with actual content; never prefill a result.

## 6. Defects, current conclusion and remaining work

Maintain a latest-result summary for the current object: AC/TC or risk | Verified scope | Result | Evidence/RUN | Remaining coverage. Separate passed, failed, blocked and unexecuted; state defects, their disposition and the next necessary work. Keep historical RUNs in the execution section above, not underneath an old current conclusion. Replace guidance with actual content; never prefill a result.

<!-- Review guidance: retain the fixed outline. Technical design precedes interface/SQL production; test cases precede planning. Self-check and explicit document approval are separate from stage done. For plan/testing, keep execution records after execution/runs respectively. -->
