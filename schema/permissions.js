const { rule, shield, allow, or } = require("graphql-shield");

const isAuthenticated = rule()(async (parent, args, ctx, info) => {
  return ctx.user.email !== null;
});

const isOwner = rule()(async (parent, args, { user }, info) => {
  // Still need to implement ownership
  const owners = parent.owners || [];
  return owners.includes(user.username);
});

const isAdmin = rule()(async (parent, args, { user }, info) => {
  return user.roles.includes("ADMIN") || user.roles.includes("ADMINISTRATOR");
});

const isModerator = rule()(async (parent, args, { user }, info) => {
  return user.roles.includes("MODERATOR");
});

const isAuth0 = rule()(async (parent, args, { user }, info) => {
  return user.roles.includes("AUTH0");
});

const isSelf = rule()(async (parent, args, ctx, info) => {
  const idMatch = ctx.user._id === parent._id;
  const emailMatch = ctx.user.email === parent.email;
  return idMatch && emailMatch;
});

const permissions = shield(
  {
    Query: {
      hello: isAuthenticated
    },
    User: {
      email: or(isSelf, isAdmin, isAuth0)
    },
    Event: {
      organizerNames: allow
    },
    Mutation: {
      "*": or(isModerator, isAdmin, isAuth0),
      login: allow
    }
  },
  {
    fallbackRule: allow
  }
);

module.exports = permissions;
