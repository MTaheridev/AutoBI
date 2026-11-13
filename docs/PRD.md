# Product requirements (summary)

AutoBI connects to existing databases and generates interactive, editable dashboards from natural-language instructions.

## Primary journey

1. Register and create a workspace
2. Connect databases
3. Discover schemas and relationships
4. Review semantic definitions
5. Build and execute validated analytical queries
6. Generate and edit dashboards from natural language / specs

## Principles

- Database-agnostic and AI-provider-agnostic
- No AI-generated executable frontend code
- No direct AI access to database credentials
- Deterministic query validation before execution
- Reproducible dashboards and queries
- AI semantic proposals stay Proposed until human approval

## Sprint outcomes

- **Sprint 1:** Auth, workspaces, AI providers, four connectors, schema introspection
- **Sprint 2:** Semantic models with propose / approve / reject
- **Sprint 3:** Query plans, dialect SQL compile, safe execute, run history
- **Sprint 4:** Dashboard specs, widget registry, NL generate, editable layout versions

**v1.0.0 shipped.** Original primary journey (connect → semantics → query → dashboards) is complete.
