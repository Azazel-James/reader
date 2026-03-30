import { stringify } from "../../lib/safe-stable-stringify.mjs";

export function jsonCompact(obj) {
    //Uses safe-stable-stringify library
    return stringify(obj);
}
