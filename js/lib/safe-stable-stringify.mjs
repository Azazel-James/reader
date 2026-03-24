/* esm.sh - safe-stable-stringify@2.5.0 */
var Q = Object.create;
var B = Object.defineProperty;
var X = Object.getOwnPropertyDescriptor;
var Y = Object.getOwnPropertyNames;
var Z = Object.getPrototypeOf,
    _ = Object.prototype.hasOwnProperty;
var k = (n, e) => () => (e || n((e = { exports: {} }).exports, e), e.exports);
var a = (n, e, f, p) => {
    if ((e && typeof e == "object") || typeof e == "function")
        for (let h of Y(e))
            !_.call(n, h) && h !== f && B(n, h, { get: () => e[h], enumerable: !(p = X(e, h)) || p.enumerable });
    return n;
};
var v = (n, e, f) => (
    (f = n != null ? Q(Z(n)) : {}),
    a(e || !n || !n.__esModule ? B(f, "default", { value: n, enumerable: !0 }) : f, n)
);
var z = k((q, W) => {
    "use strict";
    var { hasOwnProperty: M } = Object.prototype,
        N = L();
    N.configure = L;
    N.stringify = N;
    N.default = N;
    q.stringify = N;
    q.configure = L;
    W.exports = N;
    var tt = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;
    function x(n) {
        return n.length < 5e3 && !tt.test(n) ? `"${n}"` : JSON.stringify(n);
    }
    function C(n, e) {
        if (n.length > 200 || e) return n.sort(e);
        for (let f = 1; f < n.length; f++) {
            let p = n[f],
                h = f;
            for (; h !== 0 && n[h - 1] > p; ) ((n[h] = n[h - 1]), h--);
            n[h] = p;
        }
        return n;
    }
    var nt = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(Object.getPrototypeOf(new Int8Array())),
        Symbol.toStringTag
    ).get;
    function D(n) {
        return nt.call(n) !== void 0 && n.length !== 0;
    }
    function G(n, e, f) {
        n.length < f && (f = n.length);
        let p = e === "," ? "" : " ",
            h = `"0":${p}${n[0]}`;
        for (let A = 1; A < f; A++) h += `${e}"${A}":${p}${n[A]}`;
        return h;
    }
    function et(n) {
        if (M.call(n, "circularValue")) {
            let e = n.circularValue;
            if (typeof e == "string") return `"${e}"`;
            if (e == null) return e;
            if (e === Error || e === TypeError)
                return {
                    toString() {
                        throw new TypeError("Converting circular structure to JSON");
                    },
                };
            throw new TypeError('The "circularValue" argument must be of type string or the value null or undefined');
        }
        return '"[Circular]"';
    }
    function rt(n) {
        let e;
        if (M.call(n, "deterministic") && ((e = n.deterministic), typeof e != "boolean" && typeof e != "function"))
            throw new TypeError('The "deterministic" argument must be of type boolean or comparator function');
        return e === void 0 ? !0 : e;
    }
    function it(n, e) {
        let f;
        if (M.call(n, e) && ((f = n[e]), typeof f != "boolean"))
            throw new TypeError(`The "${e}" argument must be of type boolean`);
        return f === void 0 ? !0 : f;
    }
    function U(n, e) {
        let f;
        if (M.call(n, e)) {
            if (((f = n[e]), typeof f != "number")) throw new TypeError(`The "${e}" argument must be of type number`);
            if (!Number.isInteger(f)) throw new TypeError(`The "${e}" argument must be an integer`);
            if (f < 1) throw new RangeError(`The "${e}" argument must be >= 1`);
        }
        return f === void 0 ? 1 / 0 : f;
    }
    function V(n) {
        return n === 1 ? "1 item" : `${n} items`;
    }
    function ft(n) {
        let e = new Set();
        for (let f of n) (typeof f == "string" || typeof f == "number") && e.add(String(f));
        return e;
    }
    function ot(n) {
        if (M.call(n, "strict")) {
            let e = n.strict;
            if (typeof e != "boolean") throw new TypeError('The "strict" argument must be of type boolean');
            if (e)
                return (f) => {
                    let p = `Object can not safely be stringified. Received type ${typeof f}`;
                    throw (typeof f != "function" && (p += ` (${f.toString()})`), new Error(p));
                };
        }
    }
    function L(n) {
        n = { ...n };
        let e = ot(n);
        e && (n.bigint === void 0 && (n.bigint = !1), "circularValue" in n || (n.circularValue = Error));
        let f = et(n),
            p = it(n, "bigint"),
            h = rt(n),
            A = typeof h == "function" ? h : void 0,
            E = U(n, "maximumDepth"),
            m = U(n, "maximumBreadth");
        function P(b, t, r, g, o, s) {
            let i = t[b];
            switch (
                (typeof i == "object" && i !== null && typeof i.toJSON == "function" && (i = i.toJSON(b)),
                (i = g.call(t, b, i)),
                typeof i)
            ) {
                case "string":
                    return x(i);
                case "object": {
                    if (i === null) return "null";
                    if (r.indexOf(i) !== -1) return f;
                    let u = "",
                        y = ",",
                        d = s;
                    if (Array.isArray(i)) {
                        if (i.length === 0) return "[]";
                        if (E < r.length + 1) return '"[Array]"';
                        (r.push(i),
                            o !== "" &&
                                ((s += o),
                                (u += `
${s}`),
                                (y = `,
${s}`)));
                        let O = Math.min(i.length, m),
                            T = 0;
                        for (; T < O - 1; T++) {
                            let R = P(String(T), i, r, g, o, s);
                            ((u += R !== void 0 ? R : "null"), (u += y));
                        }
                        let j = P(String(T), i, r, g, o, s);
                        if (((u += j !== void 0 ? j : "null"), i.length - 1 > m)) {
                            let R = i.length - m - 1;
                            u += `${y}"... ${V(R)} not stringified"`;
                        }
                        return (
                            o !== "" &&
                                (u += `
${d}`),
                            r.pop(),
                            `[${u}]`
                        );
                    }
                    let l = Object.keys(i),
                        $ = l.length;
                    if ($ === 0) return "{}";
                    if (E < r.length + 1) return '"[Object]"';
                    let c = "",
                        S = "";
                    o !== "" &&
                        ((s += o),
                        (y = `,
${s}`),
                        (c = " "));
                    let w = Math.min($, m);
                    (h && !D(i) && (l = C(l, A)), r.push(i));
                    for (let O = 0; O < w; O++) {
                        let T = l[O],
                            j = P(T, i, r, g, o, s);
                        j !== void 0 && ((u += `${S}${x(T)}:${c}${j}`), (S = y));
                    }
                    if ($ > m) {
                        let O = $ - m;
                        ((u += `${S}"...":${c}"${V(O)} not stringified"`), (S = y));
                    }
                    return (
                        o !== "" &&
                            S.length > 1 &&
                            (u = `
${s}${u}
${d}`),
                        r.pop(),
                        `{${u}}`
                    );
                }
                case "number":
                    return isFinite(i) ? String(i) : e ? e(i) : "null";
                case "boolean":
                    return i === !0 ? "true" : "false";
                case "undefined":
                    return;
                case "bigint":
                    if (p) return String(i);
                default:
                    return e ? e(i) : void 0;
            }
        }
        function K(b, t, r, g, o, s) {
            switch (
                (typeof t == "object" && t !== null && typeof t.toJSON == "function" && (t = t.toJSON(b)), typeof t)
            ) {
                case "string":
                    return x(t);
                case "object": {
                    if (t === null) return "null";
                    if (r.indexOf(t) !== -1) return f;
                    let i = s,
                        u = "",
                        y = ",";
                    if (Array.isArray(t)) {
                        if (t.length === 0) return "[]";
                        if (E < r.length + 1) return '"[Array]"';
                        (r.push(t),
                            o !== "" &&
                                ((s += o),
                                (u += `
${s}`),
                                (y = `,
${s}`)));
                        let $ = Math.min(t.length, m),
                            c = 0;
                        for (; c < $ - 1; c++) {
                            let w = K(String(c), t[c], r, g, o, s);
                            ((u += w !== void 0 ? w : "null"), (u += y));
                        }
                        let S = K(String(c), t[c], r, g, o, s);
                        if (((u += S !== void 0 ? S : "null"), t.length - 1 > m)) {
                            let w = t.length - m - 1;
                            u += `${y}"... ${V(w)} not stringified"`;
                        }
                        return (
                            o !== "" &&
                                (u += `
${i}`),
                            r.pop(),
                            `[${u}]`
                        );
                    }
                    r.push(t);
                    let d = "";
                    o !== "" &&
                        ((s += o),
                        (y = `,
${s}`),
                        (d = " "));
                    let l = "";
                    for (let $ of g) {
                        let c = K($, t[$], r, g, o, s);
                        c !== void 0 && ((u += `${l}${x($)}:${d}${c}`), (l = y));
                    }
                    return (
                        o !== "" &&
                            l.length > 1 &&
                            (u = `
${s}${u}
${i}`),
                        r.pop(),
                        `{${u}}`
                    );
                }
                case "number":
                    return isFinite(t) ? String(t) : e ? e(t) : "null";
                case "boolean":
                    return t === !0 ? "true" : "false";
                case "undefined":
                    return;
                case "bigint":
                    if (p) return String(t);
                default:
                    return e ? e(t) : void 0;
            }
        }
        function J(b, t, r, g, o) {
            switch (typeof t) {
                case "string":
                    return x(t);
                case "object": {
                    if (t === null) return "null";
                    if (typeof t.toJSON == "function") {
                        if (((t = t.toJSON(b)), typeof t != "object")) return J(b, t, r, g, o);
                        if (t === null) return "null";
                    }
                    if (r.indexOf(t) !== -1) return f;
                    let s = o;
                    if (Array.isArray(t)) {
                        if (t.length === 0) return "[]";
                        if (E < r.length + 1) return '"[Array]"';
                        (r.push(t), (o += g));
                        let c = `
${o}`,
                            S = `,
${o}`,
                            w = Math.min(t.length, m),
                            O = 0;
                        for (; O < w - 1; O++) {
                            let j = J(String(O), t[O], r, g, o);
                            ((c += j !== void 0 ? j : "null"), (c += S));
                        }
                        let T = J(String(O), t[O], r, g, o);
                        if (((c += T !== void 0 ? T : "null"), t.length - 1 > m)) {
                            let j = t.length - m - 1;
                            c += `${S}"... ${V(j)} not stringified"`;
                        }
                        return (
                            (c += `
${s}`),
                            r.pop(),
                            `[${c}]`
                        );
                    }
                    let i = Object.keys(t),
                        u = i.length;
                    if (u === 0) return "{}";
                    if (E < r.length + 1) return '"[Object]"';
                    o += g;
                    let y = `,
${o}`,
                        d = "",
                        l = "",
                        $ = Math.min(u, m);
                    (D(t) && ((d += G(t, y, m)), (i = i.slice(t.length)), ($ -= t.length), (l = y)),
                        h && (i = C(i, A)),
                        r.push(t));
                    for (let c = 0; c < $; c++) {
                        let S = i[c],
                            w = J(S, t[S], r, g, o);
                        w !== void 0 && ((d += `${l}${x(S)}: ${w}`), (l = y));
                    }
                    if (u > m) {
                        let c = u - m;
                        ((d += `${l}"...": "${V(c)} not stringified"`), (l = y));
                    }
                    return (
                        l !== "" &&
                            (d = `
${o}${d}
${s}`),
                        r.pop(),
                        `{${d}}`
                    );
                }
                case "number":
                    return isFinite(t) ? String(t) : e ? e(t) : "null";
                case "boolean":
                    return t === !0 ? "true" : "false";
                case "undefined":
                    return;
                case "bigint":
                    if (p) return String(t);
                default:
                    return e ? e(t) : void 0;
            }
        }
        function I(b, t, r) {
            switch (typeof t) {
                case "string":
                    return x(t);
                case "object": {
                    if (t === null) return "null";
                    if (typeof t.toJSON == "function") {
                        if (((t = t.toJSON(b)), typeof t != "object")) return I(b, t, r);
                        if (t === null) return "null";
                    }
                    if (r.indexOf(t) !== -1) return f;
                    let g = "",
                        o = t.length !== void 0;
                    if (o && Array.isArray(t)) {
                        if (t.length === 0) return "[]";
                        if (E < r.length + 1) return '"[Array]"';
                        r.push(t);
                        let d = Math.min(t.length, m),
                            l = 0;
                        for (; l < d - 1; l++) {
                            let c = I(String(l), t[l], r);
                            ((g += c !== void 0 ? c : "null"), (g += ","));
                        }
                        let $ = I(String(l), t[l], r);
                        if (((g += $ !== void 0 ? $ : "null"), t.length - 1 > m)) {
                            let c = t.length - m - 1;
                            g += `,"... ${V(c)} not stringified"`;
                        }
                        return (r.pop(), `[${g}]`);
                    }
                    let s = Object.keys(t),
                        i = s.length;
                    if (i === 0) return "{}";
                    if (E < r.length + 1) return '"[Object]"';
                    let u = "",
                        y = Math.min(i, m);
                    (o && D(t) && ((g += G(t, ",", m)), (s = s.slice(t.length)), (y -= t.length), (u = ",")),
                        h && (s = C(s, A)),
                        r.push(t));
                    for (let d = 0; d < y; d++) {
                        let l = s[d],
                            $ = I(l, t[l], r);
                        $ !== void 0 && ((g += `${u}${x(l)}:${$}`), (u = ","));
                    }
                    if (i > m) {
                        let d = i - m;
                        g += `${u}"...":"${V(d)} not stringified"`;
                    }
                    return (r.pop(), `{${g}}`);
                }
                case "number":
                    return isFinite(t) ? String(t) : e ? e(t) : "null";
                case "boolean":
                    return t === !0 ? "true" : "false";
                case "undefined":
                    return;
                case "bigint":
                    if (p) return String(t);
                default:
                    return e ? e(t) : void 0;
            }
        }
        function H(b, t, r) {
            if (arguments.length > 1) {
                let g = "";
                if (
                    (typeof r == "number"
                        ? (g = " ".repeat(Math.min(r, 10)))
                        : typeof r == "string" && (g = r.slice(0, 10)),
                    t != null)
                ) {
                    if (typeof t == "function") return P("", { "": b }, [], t, g, "");
                    if (Array.isArray(t)) return K("", b, [], ft(t), g, "");
                }
                if (g.length !== 0) return J("", b, [], g, "");
            }
            return I("", b, []);
        }
        return H;
    }
});
var F = v(z()),
    gt = F.default.configure,
    st = F.default,
    ct = F.default;
export { gt as configure, ct as default, st as stringify };
//# sourceMappingURL=safe-stable-stringify.mjs.map
