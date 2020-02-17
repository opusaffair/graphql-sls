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

const schema = applyMiddleware(
  makeAugmentedSchema({
    typeDefs,
    resolvers
  }),
  permissions
);

async function getToken(event) {
  //Checks for capital A Authorization first, then lower case
  // console.log(event.headers);
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
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  });
  const getSigningKey = promisify(client.getSigningKey);
  const key = await getSigningKey(kid);
  return key;
}

async function verifyToken(token) {
  const unverified = jwt.decode(token, { complete: true });
  const key = await getPublicKey(unverified.header.kid);
  const verified = jwt.verify(token, key.publicKey);
  return verified;
}

async function makeDriver() {
  return neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
    {
      encrypted: "ENCRYPTION_ON"
    }
  );
}

const server = new ApolloServer({
  schema,
  engine: {
    // The Graph Manager API key
    apiKey: process.env.ENGINE_API_KEY,
    // A tag for this specific environment (e.g. `development` or `production`).
    // For more information on schema tags/variants, see
    // https://www.apollographql.com/docs/platform/schema-registry/#associating-metrics-with-a-variant
    schemaTag: process.env.STAGE || "dev"
  },
  context: async ({ event, context }) => {
    const token = await getToken(event);
    let user = { email: null, username: null, id: null, role: [] };
    if (token) {
      const decoded = await verifyToken(token);
      // console.log("decoded in server ", decoded);
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
        currentUser: user
      }
    };
  },
  formatError: error => {
    console.log(error);
    return error;
  },
  formatResponse: response => {
    // console.log(response);
    return response;
  },
  tracing: true,
  playground: true
});

exports.graphqlHandler = server.createHandler({
  cors: {
    origin: "*",
    credentials: true
  }
});
