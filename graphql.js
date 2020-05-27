const { ApolloServer } = require("apollo-server-lambda");
const { makeAugmentedSchema } = require("neo4j-graphql-js");
const { applyMiddleware } = require("graphql-middleware");

const neo4j = require("neo4j-driver");
const permissions = require("./schema/permissions");
const { typeDefs } = require("./schema/typeDefs");
const resolvers = require("./schema/resolvers");
const { promisify } = require("util");
const jwksClient = require("jwks-rsa");
const jwt = require("jsonwebtoken");
const { checkBasicAuth } = require("./utils/utils");
const {
  autoCreatedAt,
  autoUpdatedAt,
  autoCreateDefaults,
} = require("./schema/middleware");

const schema = applyMiddleware(
  makeAugmentedSchema({
    typeDefs,
    resolvers,
  }),
  permissions,
  autoCreatedAt,
  autoUpdatedAt,
  autoCreateDefaults
);

async function getToken(event) {
  //Checks for capital A Authorization first, then lower case
  return (
    (event.headers &&
      event.headers.Authorization &&
      event.headers.Authorization.split(" ")[1]) ||
    (event.headers &&
      event.headers.authorization &&
      event.headers.authorization.split(" ")[1])
  );
}

async function getPublicKey(kid) {
  // RSA Public Key Client
  const client = jwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  });
  const getSigningKey = promisify(client.getSigningKey);
  const key = await getSigningKey(kid || process.env.AUTH0_KID);
  return key;
}

async function verifyToken(token) {
  // console.log(token.split(".").length);
  if (token.split(".").length < 3) {
    return checkBasicAuth(token);
  }
  const unverified = jwt.decode(token, { complete: true });
  const kid = unverified.header.kid;
  if (unverified.header.alg != "RS256") return null;
  const key = await getPublicKey(kid);
  if (!key) return null;
  const verified = jwt.verify(token, key.publicKey);
  //Auth0 passes custom fields (liek roles) through a namespaced property. This pulls the role out to the user level.
  verified.roles = verified["https://www.opusaffair.com/roles"];
  //returns a user object if verified. Null if not.
  return verified;
}

async function makeDriver() {
  return neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
    {
      encrypted: "ENCRYPTION_ON",
    }
  );
}

const server = new ApolloServer({
  schema,
  engine: {
    // The Graph Manager API key
    // apiKey: process.env.ENGINE_API_KEY,
    // A tag for this specific environment (e.g. `development` or `production`).
    // For more information on schema tags/variants, see
    // https://www.apollographql.com/docs/platform/schema-registry/#associating-metrics-with-a-variant
    schemaTag: process.env.STAGE || "dev",
  },
  context: async ({ event, context }) => {
    const token = await getToken(event);
    let user = { email: null, username: null, id: null, role: [] };
    if (token) {
      const decoded = await verifyToken(token);
      if (decoded) user = decoded;
    }
    // add neo4j db to context
    let driver;
    if (!driver) {
      driver = await makeDriver();
    }

    return {
      headers: event.headers,
      functionName: context.functionName,
      driver,
      event,
      user,
      cypherParams: {
        currentUser: user,
      },
    };
  },
  formatError: (error) => {
    console.log(error);
    return error;
  },
  formatResponse: (response) => {
    // console.log(response);
    return response;
  },
  tracing: true,
  playground: true,
});

exports.graphqlHandler = server.createHandler({
  cors: {
    origin: "*",
    credentials: true,
  },
});
