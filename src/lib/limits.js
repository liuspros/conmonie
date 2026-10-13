// Face match limit (lower = stricter). About 0.6 is the usual same-person ceiling; we use a little less.
export const FACE_MAX = 0.55;
export const STATEMENT_MAX_DAYS = 100;
export const POST_MAX_DAYS = 30;
// Some wallets (for example OPay) print no home address on their statements. When true, the member may type their address
// instead; it is recorded as "typed" rather than "statement". Set to false to require an address printed on the statement.
export const ALLOW_TYPED_ADDRESS = true;
