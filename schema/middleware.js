const appendCreatedAt = (r, p, a, c, i) => {
  const formatted = new Date().toISOString();
  a.createdAt = { formatted };
  return r(p, a, c, i);
};

const appendUpdatedAt = (r, p, a, c, i) => {
  const formatted = new Date().toISOString();
  console.log(c.user);
  a.updatedAt = { formatted };
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

module.exports = { autoUpdatedAt, autoCreatedAt };
