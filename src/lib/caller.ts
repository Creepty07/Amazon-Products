/// <reference types="node" />
import { createHmac, timingSafeEqual } from "crypto";
import { APIGatewayProxyEvent } from "aws-lambda";

// `any` replica el tipo de requestContext.authorizer del codigo original (los handlers del profe asumen ese tipo).
export interface Caller {
    userId?: any;
    role?: any;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "";

// Verifica un JWT HS256 (misma firma que genera el modulo Users) sin dependencias externas.
const verifyHs256 = (token: string): Caller => {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature || !JWT_SECRET) {
        throw new Error("Token invalido");
    }
    if (JSON.parse(Buffer.from(header, "base64url").toString()).alg !== "HS256") {
        throw new Error("Algoritmo no permitido");
    }

    const expected = createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest();
    const received = Buffer.from(signature, "base64url");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
        throw new Error("Firma invalida");
    }

    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
        throw new Error("Token vencido");
    }
    return { userId: claims.userId, role: claims.role };
};

// D6: LocalStack no ejecuta el Lambda authorizer, asi que requestContext.authorizer llega vacio.
// En AWS real se usa el contexto del authorizer (prioridad); si falta, se verifica la firma del JWT aqui.
export const getCaller = (event: APIGatewayProxyEvent): Caller => {
    const ctx = event.requestContext.authorizer;
    if (ctx?.userId) {
        return { userId: ctx.userId, role: ctx.role };
    }

    const header = event.headers?.Authorization ?? event.headers?.authorization ?? "";
    try {
        return verifyHs256(header.replace(/^Bearer\s+/i, ""));
    } catch {
        return {};
    }
};
