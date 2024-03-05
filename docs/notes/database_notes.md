All of these options have docker images. All have own or 3rd party cloud providers.

## RDBMS:

- SQLite (allows in-memory databases)
- Postgres (more scalable)
  Traditional SQL databases. Very popular database solutions with a lot of support online. However they're not well optimised for traversing relations, requiring expensive table JOINs for every hop. They were never designed for complex data types and SQL doesn't offer native syntax for this kind of operation. Queries with arbitrary number of relation traversal hops will have to be generated on the fly, they'll get longer and much slower with a higher hop count.

## Polymorphic Object DB:

- TypeDB
  Strongly typed and subtypable entities and relations between them. TypeDB uses its own TypeQL query language. Unfortunately it makes it difficuilt to traverse relations recursively in a single query, especially different kinds of relations. It does not currently allow creating custom functions. Traversal queries with arbitrary number of hops will have to be generated on the fly and will end up being long and ugly, since TypeQL doesn't support this functionality natively. Should still be better than RDBMS in terms of performance. It's possible to achieve n-hops traversal with complex rules in schema, but this is a bit ugly and may hurt performance.

## Graph DB:

- Neo4j (more popular, not as foss as I'd like)
- Memgraph (fast in-memory database with optional on-disk storage for persistence)
  Use Cypher (originally created for Neo4j) as query language. Relations are stores as bi-directional references directly in the nodes rather than in a separate table (as is the case with SQL many-to-many relations), which elliminates JOINs and leads to good traversal performance. Language supports recursive relation traversal and overall design seems to fit my needs. The only obvious shortcoming is lack of polymorphism, which shouldn't be an issue in my case.
