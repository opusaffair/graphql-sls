const { v4: uuid } = require("uuid");

const appendCreatedAt = (r, p, a, c, i) => {
  const formatted = new Date().toISOString();
  a.createdAt = { formatted };
  a.updatedAt = { formatted };
  return r(p, a, c, i);
};

const appendUpdatedAt = (r, p, a, c, i) => {
  const formatted = new Date().toISOString();
  a.updatedAt = { formatted };
  a.updatedBy = c.user.email;
  return r(p, a, c, i);
};

const handleCreateUserDefaults = (r, p, a, c, i) => {
  //If no username provided, set username and opus_id to same UUID
  if (!a.username) {
    const id = uuid();
    a.username = id;
    a.opus_id = id;
    a.viewable = false;
  }
  return r(p, a, c, i);
};

const autoCreatedAt = {
  Query: {},
  Mutation: {
    // Mapping of resolvers to append argument to
    CreateUser: appendCreatedAt,
    CreateResponse: appendCreatedAt,
    CreateVenue: appendCreatedAt,
    CreateOrg: appendCreatedAt,
    CreateTag: appendCreatedAt,
    CreateInstance: appendCreatedAt,
    CreateEvent: appendCreatedAt
  }
};

const autoUpdatedAt = {
  Query: {},
  Mutation: {
    // Mapping of resolvers to append argument to
    UpdateUser: appendUpdatedAt,
    UpdateResponse: appendUpdatedAt,
    UpdateVenue: appendUpdatedAt,
    UpdateOrg: appendUpdatedAt,
    UpdateTag: appendUpdatedAt,
    UpdateInstance: appendUpdatedAt,
    UpdateEvent: appendUpdatedAt,
    MergeUser: appendUpdatedAt,
    MergeResponse: appendUpdatedAt,
    MergeVenue: appendUpdatedAt,
    MergeOrg: appendUpdatedAt,
    MergeTag: appendUpdatedAt,
    MergeInstance: appendUpdatedAt,
    MergeEvent: appendUpdatedAt
  }
};

const autoCreateDefaults = {
  Mutation: {
    CreateUser: handleCreateUserDefaults
  }
};
module.exports = { autoUpdatedAt, autoCreatedAt, autoCreateDefaults };
