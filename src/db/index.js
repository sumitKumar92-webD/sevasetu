import mongoose from "mongoose";

/* ------------------------------------------------------------------ */
/*  MongoDB connection (Mongoose)                                      */
/* ------------------------------------------------------------------ */
/*  Set DATABASE_URL (or MONGO_URI) to your MongoDB Atlas string,      */
/*  e.g.                                                               */
/*  DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/sevasetu  */
/*                                                                    */
/*  If no MongoDB URL is configured, the app automatically starts a    */
/*  local in-memory MongoDB so you can develop / demo instantly.       */
/* ------------------------------------------------------------------ */

const RAW_URL =
  process.env.DATABASE_URL || process.env.MONGO_URI || process.env.MONGODB_URI || "";

const isMongoUrl = (url) => /^mongodb(\+srv)?:\/\//i.test(url.trim());

const state = {
  ready: null, // shared promise so parallel requests connect only once
  memory: null, // MongoMemoryServer instance (dev fallback)
  usingFallback: false,
  error: null,
};

async function startMemoryServer() {
  const { MongoMemoryServer } = await import("mongodb-memory-server-core");
  // A free port is picked automatically so several dev servers can run at once.
  const server = await MongoMemoryServer.create({ instance: { dbName: "sevasetu" } });
  return { server, uri: server.getUri("sevasetu").replace(/\/$/, "") };
}

export async function connectDB() {
  if (state.ready) return state.ready;
  if (mongoose.connection.readyState === 1) return mongoose;

  state.ready = (async () => {
    let uri = "";
    try {
      if (RAW_URL && isMongoUrl(RAW_URL)) {
        uri = RAW_URL;
      } else {
        if (RAW_URL) {
          console.warn(
            "[db] DATABASE_URL is not a MongoDB connection string -> using local fallback MongoDB."
          );
        }
        const mem = await startMemoryServer();
        state.memory = mem.server;
        state.usingFallback = true;
        uri = mem.uri;
        console.log("[db] Local in-memory MongoDB started:", uri);
      }

      mongoose.set("strictQuery", true);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

      // If we lose the connection (e.g. Atlas restarts), retry once.
      mongoose.connection.on("disconnected", () => {
        state.ready = null;
        console.warn("[db] MongoDB disconnected");
      });

      console.log(state.usingFallback ? "MongoDB Connected (local fallback)" : "MongoDB Connected");
      return mongoose;
    } catch (error) {
      state.ready = null;
      state.error = error;
      console.error("[db] MongoDB connection failed:", error.message);
      throw error;
    }
  })();

  return state.ready;
}

/** Any route handler calls this before touching the models. */
export async function getDB() {
  try {
    await connectDB();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export function dbStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    usingFallback: state.usingFallback,
    error: state.error ? state.error.message : null,
  };
}

/** Safe ObjectId helper (accepts strings, ObjectIds or populated docs). */
export function oid(value) {
  if (!value) return null;
  if (typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return value;
}

/** String id of a value that may be an id, an ObjectId or a populated doc. */
export function idOf(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  if (value.toString) return value.toString();
  return String(value);
}

/** Compare two ids safely (string vs ObjectId vs populated doc). */
export function sameId(a, b) {
  const x = a ? idOf(a) : null;
  const y = b ? idOf(b) : null;
  return !!x && !!y && x === y;
}

/** Turn Mongoose documents into plain objects that expose `id` (not `_id`). */
export function toJson(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(toJson);
  if (typeof doc.toObject === "function") doc = doc.toObject({ virtuals: true });
  if (doc._id) {
    doc.id = String(doc._id);
    delete doc._id;
  }
  delete doc.__v;
  return doc;
}

export default mongoose;
