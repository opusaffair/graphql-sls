// Set defaults for Boston
const lat = 42.3601,
  lng = -71.058,
  radius = 5000;

// Construct a schema, using GraphQL schema language
const typeDefs = `

    enum RoleName {
      ADMIN
      MODERATOR
      HOST
      USER
    }

type Role {
  name: String!
  users: [User] @relation(name: "HAS_ROLE", direction: "IN")
}

  type Query {
    """
    Tests that you're logged in
    """
    hello: String
    cypherMe: String @cypher(statement: "RETURN $cypherParams.currentUser.email")
    me: String
    ctx: String
    currentUser: User @cypher(statement:"MATCH (this {email:$cypherParams.currentUser.email}) RETURN this")
    eventDetail(slug: String): Event @cypher(statement: "MATCH (this:Event {slug:$slug}) RETURN this")
  }

  type Mutation {
    convertToInstances: String @cypher(statement: """
      Match (e:Event)--(v:Venue)
      MERGE (e)-[:HELD_ON]->(i:Instance{endDateTime:datetime({epochSeconds:toInteger(e.start_datetime), timezone: v.timezone}),startDateTime:datetime({epochSeconds:toInteger(e.start_datetime), timezone: v.timezone})})-[:HELD_AT]->(v)
      SET i.location=point({latitude:v.latitude,longitude:v.longitude})
      RETURN 'Finished'
    """)
    convertLocations: String @cypher(statement: """
      Match (v:Venue)
      SET v.location = point({latitude:v.latitude, longitude:v.longitude})
      SET v.timezone = 'America/New York'
      RETURN 'Finished'
    """)
    convertUserDefaultLocationsFromChapter: String @cypher(statement: """
      Match (u:User)--(c:Chapter)
      WITH u,c,
      CASE c.city
      WHEN 'Boston' then point({latitude:42.3601,longitude:-71.058})
      WHEN 'Miami' then point({latitude:25.7617,longitude:-80.1918})
      END as p,
      CASE c.city
      WHEN 'Boston' then 7000
      WHEN 'Miami' then 10000
      END as r
      SET c.location = p, c.radius = r
      SET u.location = c.location
      SET u.radius = c.radius
      RETURN 'Finished'
  """)
    setPopularityScores: String @cypher(statement:"""
    MATCH (this:Event)
    OPTIONAL MATCH (this)<-[r]-(u:User)
    OPTIONAL MATCH (this)<--(u)<-[:FOLLOWS]-(follower:User)
    OPTIONAL MATCH (this)-[:HELD_ON]->(i:Instance)
    WITH this, [x in collect(distinct r) | type(x)] as rsvps, COUNT(distinct follower) as fols, apoc.coll.sort(apoc.coll.union(collect(i.startDateTime),collect(i.endDateTime) )) as dates
    WITH this, dates, apoc.coll.occurrences(rsvps,"INVOLVED_IN") as inv, apoc.coll.occurrences(rsvps,"ATTENDING") as att ,apoc.coll.occurrences(rsvps,"INTERESTED_IN") as int, fols,
    CASE 
    WHEN dates[-1].epochSeconds-dates[0].epochSeconds > 604800
    THEN (dates[-1].epochSeconds-dates[0].epochSeconds)/604800
    ELSE 0
    END as longRun
    WITH this, inv*1000+att*300+int*100-longRun*300+fols as score
    SET this.popularityScore = score
    RETURN 'finished'
    """)
    login(email: String!, password: String!): String
    auth0Login(email: String!, password: String!): String
    auth0Create(email: String!, password: String!): String
    auth0ChangePassword(email: String!, newPasswordHash: String!): String
    auth0Verify(email: String!): String
  }

  type User {
    opus_id: ID!
    _id: ID!
    createdAt: DateTime
    updatedAt: DateTime
    updatedBy: String
    username: String!
    slug: String @cypher(statement: "RETURN this.username")
    password_hash: String!
    confirmed: Boolean
    viewable: Boolean
    """Only visible to admins or self"""
    email: String!
    avatar_url: String
    location: Point
    radius: Float
    name_full: String @cypher(statement: "Return this.name_first+' '+this.name_last")
    name_first: String
    name_last: String
    member_since: Float
    last_seen: Float
    roles: [Role] @relation(name: "HAS_ROLE", direction: "OUT")
    timezone: String
    website: String
    twitter: String
    facebook: String
    events: [Response]  @relation(name: "RESPONDED", direction: "OUT")
    emailSubOpusEvents: Boolean
    emailSubWeeklyCal: Boolean
    emailSubOffers: Boolean
    followedByUser(email: String = ""): Boolean @cypher(statement: """
      MATCH (me:User {email: toLower($email)})
      RETURN EXISTS ((me)-[:FOLLOWS]->(this))
    """) 
  } 

  type Response {
    status: String
    how: String
    createdAt: DateTime
    updatedAt: DateTime
    updatedBy: String
    User: User @relation(name: "RESPONDED", direction: "IN")
    Event: Event @relation(name: "RESPONDED_TO", direction: "OUT")
  }

  type Venue {
    opus_id: ID!
    _id: ID!
    createdAt: DateTime
    updatedAt: DateTime
    updatedBy: String
    name: String!
    slug: String!
    location: Point
    address: String
    city: String
    state: String
    zip_code: String
    country: String
    timezone: String
    latitude: Float
    longitude: Float
    events: [Event] @relation(name: "HELD_AT", direction: "IN")
  }

  type Org {
    opus_id: ID!
    _id: ID!
    createdAt: DateTime
    updatedAt: DateTime
    updatedBy: String
    name: String!
    slug: String!
    website: String
    twitter: String
  }

  type Tag {
    opus_id: ID!
    createdAt: DateTime
    updatedAt: DateTime
    updatedBy: String
    _id: ID!
    name: String!
    slug: String!
    category: String
  }

  type Instance {
    opus_id: ID!
    _id: ID!
    createdAt: DateTime
    updatedAt: DateTime
    updatedBy: String
    Event: Event @relation(name: "HELD_ON", direction: "IN")
    Venue: Venue @relation(name: "HELD_AT", direction: "OUT")
    Tag: Tag @relation(name: "TAGGED", direction: "IN")
    location: Point
    startDateTime: DateTime
    endDateTime: DateTime
    # endDate: String
    # startDate: String
    # startTime: String
    note: String
    override_url: String
    isNearMe(latitude: Float = 42.3601, longitude: Float = -71.058, range: Float = 7000): Boolean @cypher(statement:"""
      Match (this)
      Return distance(point({latitude:this.latitude, longitude:this.longitude}), point({latitude:$latitude, longitude:$longitude})) < $range
      """)
  }

  type Event {
    opus_id: ID!
    _id: ID!
    createdAt: DateTime
    updatedAt: DateTime
    updatedBy: String
    title: String!
    supertitle_creative: String
    slug: String!
    image_url: String
    photo_cred: String
    ticket_link: String
    published: Boolean
    alert: String
    organizer_desc: String
    popularityScore: Float
    isPast: Boolean @cypher(statement:"""
      MATCH (this)--(i:Instance)
      WITH this, apoc.coll.sort(collect(i.endDateTime)) as dates
      RETURN dates[-1] < datetime()
    """)
    start_datetime: Float
    end_datetime: Float
    last_modified: Float
    # startDateTime: DateTime
    # endDateTime: DateTime
    firstInstanceStartDateTimeString: String @cypher(statement: """
          MATCH (this)--(i:Instance)
          WITH apoc.coll.sort(collect(apoc.convert.toString(i.startDateTime))) as dates
          RETURN dates[0]
    """)
    lastInstanceEndDateTimeString: String @cypher(statement: """
        MATCH (this)--(i:Instance)
        WITH apoc.coll.sort(collect(apoc.convert.toString(i.endDateTime))) as dates
        RETURN dates[-1]
    """)
    instanceCount: Float @cypher(statement:"MATCH (this)-->(i:Instance) RETURN count(distinct i)")
    # display_daterange(showTime: Boolean = true, withYear: Boolean = true, longMonth: Boolean = true): String
    displayInstanceDaterange(showTime: Boolean = true, withYear: Boolean = true, longMonth: Boolean = true): String
    Venue: [Venue] @relation(name: "HELD_AT", direction: "OUT")
    Instance: [Instance] @relation(name: "HELD_ON", direction: "OUT")
    Org: [Org] @relation(name: "ORGANIZES", direction: "IN")
    Tag: [Tag] @relation(name: "TAGGED", direction: "IN" )
    owners: [User] @relation(name: "OWNS", direction: "IN")
    organizerNames(conjunction:String = "and", oxfordComma:Boolean = true): String @cypher(statement:"""
      MATCH (this)<-[:ORGANIZES]-(org:Org)
      RETURN COLLECT(org.name)
      """)
    venueNames(conjunction:String = "and", oxfordComma:Boolean = true): String @cypher(statement:"""
      MATCH (this)-[:HELD_AT]->(v:Venue)
      RETURN COLLECT(v.name)
      """)
    members_connected: [User] @cypher(statement: "MATCH (this)--(u:User) RETURN u")
    members_connected_count: Int @cypher(statement: "MATCH (this)--(u:User) RETURN count(distinct u)")
    users: [Response]  @relation(name: "RESPONDED_TO", direction: "IN")
    involved_in: [User] @relation(name: "INVOLVED_IN", direction: "IN")
    interested: [User] @relation(name: "INTERESTED_IN", direction: "IN")
    attending: [User] @relation(name: "ATTENDING", direction: "IN")
    popularity: Float
      @cypher(statement: """
      MATCH (this)
      Optional Match pe=((this)--(u:User))
      Optional Match (this)<-[inv:INVOLVED_IN]-(u) 
      Optional Match (this)<-[int:INTERESTED_IN]-(u) 
      Optional Match (this)<-[att:ATTENDING]-(u)
      WITH this, pe, inv, int, att,u, CASE
      WHEN (this.end_datetime - this.start_datetime) > 604800 THEN (this.end_datetime - this.start_datetime) / 604800
      ELSE 0
      END as longRun
      RETURN 1000*count(distinct inv)
      +300*count(distinct att)
      +100*count(distinct int) 
      -500*longRun
      +10*sum(distinct reduce(weight = 0, r1 in relationships(pe) | weight + u.follower_count))^2 
      """)
    popularityExperiment(
      invWeight: Int = 1000
      attWeight: Int = 300
      intWeight: Int = 100
      invFolWeight: Int = 10
      attFolWeight: Int = 2
      intFolWeight: Int = 1
      longRunWeight: Int = -100
      ): Float @cypher(statement:"""
      Match (this)
      Optional Match (this)--(i:Instance)
      Optional Match pe=((this)--(u:User))
      Optional Match (this)<-[:INVOLVED_IN]-(inv) 
      Optional Match (this)<-[:INTERESTED_IN]-(int) 
      Optional Match (this)<-[:ATTENDING]-(att)
      Optional Match (inv)<-[:FOLLOWS]-(invFol)
      Optional Match (att)<-[:FOLLOWS]-(attFol)
      Optional Match (int)<-[:FOLLOWS]-(intFol)
      WITH this, pe,u, inv, int, att,invFol, intFol, attFol, 
      CASE
      WHEN (this.end_datetime - this.start_datetime) > 604800 THEN (this.end_datetime - this.start_datetime) / 604800
      ELSE 0
      END as longRun
      RETURN 
      $invWeight*count(distinct inv)
      +$attWeight*count(distinct att)
      +$intWeight*count(distinct int) 
      +$longRunWeight * longRun
      +$invFolWeight*count(distinct invFol)
      +$attFolWeight*count(distinct attFol)
      +$intFolWeight*count(distinct intFol)
    """)
    recommended (email: String = ""): Float
      @cypher(statement: """
      MATCH (me:User {email: $email})
      Optional MATCH folInv=((this)<-[:INVOLVED_IN]-(:User)<-[r3:FOLLOWS]-(me))
      Optional MATCH selfConnected=((this)<-[:INTERESTED_IN|ATTENDING|INVOLVED_IN]-(me))
      Optional MATCH tagsVenuesAndOrgs=((this)-[:HELD_AT|ORGANIZES]-(x)-[:HELD_AT|ORGANIZES]-(:Event)<--(me))
      RETURN 1000*count(distinct selfConnected)+2000*count(distinct folInv) + 1*count(distinct tagsVenuesAndOrgs) + this.popularityScore
      """)
  }
`;

module.exports = { typeDefs };
