/*
 * SECURITY STARTER for an Appwrite Function.
 * This endpoint is intentionally fail-closed. Complete the TODOs in README before production.
 * Never expose API keys or admin secrets to the browser.
 */
import { Client, Databases, Query, ID } from "node-appwrite";
import crypto from "node:crypto";

export default async ({ req, res, log, error }) => {
  try {
    const env = process.env;
    const required = ["APPWRITE_FUNCTION_API_ENDPOINT","APPWRITE_FUNCTION_PROJECT_ID","APPWRITE_API_KEY","DATABASE_ID","STUDENTS_COLLECTION_ID","EVENTS_COLLECTION_ID"];
    for (const k of required) if (!env[k]) return res.json({ok:false,message:`Server configuration missing: ${k}`},500);
    const client = new Client().setEndpoint(env.APPWRITE_FUNCTION_API_ENDPOINT).setProject(env.APPWRITE_FUNCTION_PROJECT_ID).setKey(env.APPWRITE_API_KEY);
    const db = new Databases(client);
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const hash = value => crypto.createHash("sha256").update(String(value)).digest("hex");
    const randomCode = () => crypto.randomBytes(5).toString("hex").toUpperCase();
    const now = new Date();
    const findStudent = async id => {
      const result = await db.listDocuments(env.DATABASE_ID,env.STUDENTS_COLLECTION_ID,[Query.equal("studentId",id),Query.limit(1)]);
      return result.documents[0] || null;
    };
    if (body.action === "login") {
      const student = await findStudent(body.studentId);
      if (!student || student.active !== true) return res.json({ok:false,message:"Access details are not valid."},401);
      if (body.temporary) {
        const t = student.temporaryCodeHash;
        if (!t || t !== hash(body.code) || !student.temporaryCodeExpiresAt || new Date(student.temporaryCodeExpiresAt) <= now || student.temporaryCodeUsed === true)
          return res.json({ok:false,message:"This assessment code is invalid, expired or already used."},401);
        await db.updateDocument(env.DATABASE_ID,env.STUDENTS_COLLECTION_ID,student.$id,{temporaryCodeUsed:true});
      } else {
        if (!student.permanentCodeHash || student.permanentCodeHash !== hash(body.code))
          return res.json({ok:false,message:"Access details are not valid."},401);
      }
      // TODO PRODUCTION: issue a short-lived signed session token and store its hash server-side.
      // Do not use a student record ID as an authentication token.
      const sessionToken = crypto.randomBytes(32).toString("base64url");
      await db.createDocument(env.DATABASE_ID,env.EVENTS_COLLECTION_ID,ID.unique(),{
        studentId:student.studentId,eventType:"login",at:now.toISOString(),detail:body.temporary?"temporary":"permanent"
      });
      return res.json({ok:true,studentId:student.studentId,role:student.role||"student",sessionToken});
    }
    if (body.action === "event") {
      const student = await findStudent(body.studentId);
      if (!student) return res.json({ok:false,message:"Unknown student."},401);
      await db.createDocument(env.DATABASE_ID,env.EVENTS_COLLECTION_ID,ID.unique(),{
        studentId:student.studentId,eventType:String(body.eventType||"event").slice(0,40),at:String(body.at||now.toISOString())
      });
      return res.json({ok:true});
    }
    // Admin actions must not be enabled until a proper signed-session verifier is implemented.
    if (String(body.action||"").startsWith("admin_"))
      return res.json({ok:false,message:"Admin operations are disabled until the signed-session and role verification TODOs are completed in the function."},403);
    return res.json({ok:false,message:"Unknown action."},400);
  } catch (e) {
    error(e?.stack || String(e));
    return res.json({ok:false,message:"The service could not complete that request."},500);
  }
};