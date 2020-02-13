// Set defaults for Boston
const lat = 42.3601,
  lng = -71.058,
  radius = 5000;

// Construct a schema, using GraphQL schema language
const typeDefs = `

    enum Role {
      ADMIN
      MODERATOR
      HOST
      USER
    }

  type Query {
    hello: String
    cypherMe: String @cypher(statement: "RETURN $cypherParams.currentUserId")
    me: String
    ctx: String
  }

  type Mutation {
    convertDates: String @cypher(statement: """
      Match (e:Event)--(v:Venue)
      SET e.startDateTime = datetime({epochSeconds:toInteger(e.start_datetime), timezone: v.timezone})
      SET e.endDateTime = datetime({epochSeconds:toInteger(e.end_datetime), timezone: v.timezone})
      RETURN 'Finished'
    """)
    convertLocations: String @cypher(statement: """
      Match (v:Venue)
      SET v.location = point({latitude:v.latitude, longitude:v.longitude})  
      RETURN 'Finished'
    """)
    convertUserDefaultLocationsFromChapter: String @cypher(statement: """
    Match (u:User)--(c:Chapter)
    SET u.location = c.location
    SET u.radius = c.radius
    RETURN 'Finished'
  """)
    login(email: String!, password: String!): String
  }

  type User {
    username: String!
    slug: String @cypher(statement: "RETURN this.username")
    _id: ID!
    hash: String!
    confirmed: Boolean
    viewable: Boolean
    email: String!
    location: Point
    radius: Float
    name_first: String
    name_last: String
    member_since: Float
    last_seen: Float
    timezone: String
    website: String
    twitter: String
    facebook: String
    Involvement: [Involvement]  @relation(name: "INVOLVEMENT", direction: "OUT")
    attending: [Event] @relation(name: "ATTENDING", direction: "OUT")
    interested_in: [Event] @relation(name: "INTERESTED_IN", direction: "OUT")
    involved_in: [Event] @relation(name: "INVOLVED_IN", direction: "OUT")
    emailSubOpusEvents: Boolean
    emailSubWeeklyCal: Boolean
    emailSubOffers: Boolean
    bacon_number: Float @cypher(statement: """
      Match (u:User)
      WHERE u.username <> this.username
      Match p=shortestPath((this)-[*1..3:INVOLVED_IN]-(u)) 
      Return avg(length(p)) as bacon
    """)
    followedByUser(email: String = ""): Boolean @cypher(statement: """
      MATCH (me:User {email: toLower($email)})
      RETURN EXISTS ((me)-[:FOLLOWS]->(this))
    """) 
  } 

  type Venue {
    _id: ID!
    name: String!
    slug: String!
    location: Point
    timezone: String
    latitude: Float
    longitude: Float
    events: [Event] @relation(name: "HELD_AT", direction: "IN")
  }

  type Org {
    _id: ID!
    name: String!
    slug: String!
    website: String
    twitter: String
  }

  type Tag {
    _id: ID!
    name: String!
    slug: String!
  }


  type Involvement {
    _id: ID!
    User: User @relation(name: "INVOLVEMENT", direction: "IN")
    Event: Event @relation(name: "INVOLVEMENT", direction: "OUT")
    how: String
  }

  type Instance {
    _id: ID!
    Event: Event @relation(name: "HELD_ON", direction: "IN")
    Venue: Venue @relation(name: "HELD_AT", direction: "OUT")
    Tag: Tag @relation(name: "TAGGED", direction: "IN")
    start_datetime: DateTime
    end_datetime: DateTime
    endDate: String
    startDate: String
    startTime: String
    note: String
    override_url: String
  }

  type Event {
    _id: ID!
    title: String!
    slug: String!
    image_url: String
    published: Boolean
    start_datetime: Float
    end_datetime: Float
    startDateTime: DateTime
    endDateTime: DateTime
    display_daterange(showTime: Boolean = true, withYear: Boolean = true, longMonth: Boolean = true): String
    Venue: [Venue] @relation(name: "HELD_AT", direction: "OUT")
    Instance: [Instance] @relation(name: "HELD_ON", direction: "OUT")
    Org: [Org] @relation(name: "ORGANIZES", direction: "IN")
    Tag: [Tag] @relation(name: "TAGGED", direction: "IN" )
    owners: [User] @relation(name: "OWNS", direction: "IN")
    organizerNames(conjunction:String = "and", oxfordComma:Boolean = true): String @cypher(statement:"""
      MATCH (this)<-[:ORGANIZES]-(org:Org)
      RETURN COLLECT(org.name)
      """)
    members_connected: [User] @cypher(statement: "MATCH (this)--(u:User) RETURN u")
    members_connected_count: Int @cypher(statement: "MATCH (this)--(u:User) RETURN count(distinct u)")
    Involvement: [Involvement]  @relation(name: "INVOLVEMENT", direction: "IN")
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
      END as dscore
      RETURN 1000*count(distinct inv)
      +300*count(distinct att)
      +100*count(distinct int) 
      -0*dscore
      +10*sum(distinct reduce(weight = 0, r1 in relationships(pe) | weight + u.follower_count))^2 
      """)
    recommended (email: String ): Float
      @cypher(statement: """
      MATCH (me:User {email: $email})
      Optional MATCH folInv=((this)<-[:INVOLVED_IN]-(:User)<-[r3:FOLLOWS]-(me))
      Optional MATCH tagsVenuesAndOrgs=((this)-[:HELD_AT|ORGANIZES|TAGGED]-(x)-[:HELD_AT|ORGANIZES|TAGGED]-(:Event)<--(me))
      RETURN 10*count(folInv) + count(tagsVenuesAndOrgs)
      """)
  }
`;

module.exports = { typeDefs };
