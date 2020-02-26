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
  console.log(
    user.roles.includes("ADMIN") || user.roles.includes("ADMINISTRATOR")
  );
  return user.roles.includes("ADMIN") || user.roles.includes("ADMINISTRATOR");
});

const isModerator = rule()(async (parent, args, { user }, info) => {
  return user.roles.includes("MODERATOR");
});

const isAuth0 = rule()(async (parent, args, { user }, info) => {
  return user.roles.includes("AUTH0");
});

const isSelf = rule()(async (parent, { email = null }, ctx, info) => {
  const emailMatch = ctx.user.email === email;
  return emailMatch;
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
      CreateUser: or(isSelf, isAdmin, isModerator, isAuth0),
      UpdateUser: or(isSelf, isAdmin, isModerator, isAuth0),
      "*": or(isAdmin, isModerator, isAuth0),
      login: allow
    }
  },
  {
    fallbackRule: allow
  }
);

module.exports = permissions;
