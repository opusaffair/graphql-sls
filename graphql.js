const { ApolloServer } = require("apollo-server-lambda");
const { makeAugmentedSchema } = require("neo4j-graphql-js");
const { applyMiddleware } = require("graphql-middleware");

const neo4j = require("neo4j-driver");
const permissions = require("./schema/permissions");
const { typeDefs } = require("./schema/typeDefs");
const resolvers = require("./schema/resolvers");
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
  return (
    (event.headers &&
      event.headers.Authorization &&
      event.headers.Authorization.split(" ")[1]) ||
    (event.headers &&
      event.headers.authorization &&
      event.headers.authorization.split(" ")[1])
  );
}

async function verifyToken(token) {
  //TO-DO:
  //need to handle invalid token response
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function makeDriver() {
  return neo4j.driver(
    process.env.NEO4J_URI_GRAPHENEDB,
    neo4j.auth.basic(
      process.env.NEO4J_USERNAME_GRAPHENEDB,
      process.env.NEO4J_PASSWORD_GRAPHENEDB
    ),
    {
      encrypted: "ENCRYPTION_ON"
    }
  );
}

const server = new ApolloServer({
  schema,
  engine: {
    // The Graph Manager API key
    apiKey: process.env.ENGINE_API_KEY
    // A tag for this specific environment (e.g. `development` or `production`).
    // For more information on schema tags/variants, see
    // https://www.apollographql.com/docs/platform/schema-registry/#associating-metrics-with-a-variant
    // schemaTag: "development"
  },
  context: async ({ event, context }) => {
    const token = await getToken(event);
    let user = { email: null, username: null, id: null, role: [] };
    if (token) {
      const decoded = await verifyToken(token);
      user = decoded.user;
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
        currentUserId: user.username
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
