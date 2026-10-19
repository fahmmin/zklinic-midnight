// Polyfills and env (aligned with example-zkloan zkloan-credit-scorer-ui)
import { Buffer } from "buffer";
if (typeof globalThis.process === "undefined") {
    globalThis.process = {
        env: {
            NODE_ENV: import.meta.env.MODE || "production"
        },
        version: "",
        cwd: () => "/"
    };
}
if (typeof globalThis.Buffer === "undefined") {
    globalThis.Buffer = Buffer;
}
