import { z } from "zod";
import { verifyFirebaseAppCheckToken, verifyFirebaseIdToken, } from "@repo/gcp-firebase";
const headerSchema = z.object({
    authorization: z.string().min(1),
    "x-firebase-appcheck": z.string().min(1),
});
const bearerSchema = z.string().regex(/^Bearer\s+(.+)$/i);
function extractBearerToken(value) {
    const parsed = bearerSchema.safeParse(value);
    if (!parsed.success)
        return null;
    return parsed.data.replace(/^Bearer\s+/i, "");
}
export const authValidateRoute = async (fastify, opts) => {
    fastify.get("/auth/validate", async (request, reply) => {
        const parsedHeaders = headerSchema.safeParse(request.headers);
        if (!parsedHeaders.success) {
            return reply.status(401).send({
                ok: false,
                code: "MISSING_AUTH_HEADERS",
                message: "Authorization and X-Firebase-AppCheck headers are required.",
            });
        }
        const idToken = extractBearerToken(parsedHeaders.data.authorization);
        if (!idToken) {
            return reply.status(401).send({
                ok: false,
                code: "INVALID_AUTH_HEADER",
                message: "Authorization header must be a Bearer token.",
            });
        }
        try {
            const [decodedIdToken, decodedAppCheck] = await Promise.all([
                verifyFirebaseIdToken(idToken, opts.firebaseAdminConfig),
                verifyFirebaseAppCheckToken(parsedHeaders.data["x-firebase-appcheck"], opts.firebaseAdminConfig),
            ]);
            return reply.send({
                ok: true,
                user: {
                    uid: decodedIdToken.uid,
                    email: decodedIdToken.email ?? null,
                    claims: decodedIdToken,
                },
                appCheck: {
                    appId: decodedAppCheck.appId,
                },
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Token verification failed.";
            return reply.status(401).send({
                ok: false,
                code: "TOKEN_VERIFICATION_FAILED",
                message,
            });
        }
    });
};
