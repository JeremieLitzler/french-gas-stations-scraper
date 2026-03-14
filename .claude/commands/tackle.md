Tackle GitHub issue $ARGUMENTS using the multi-agent pipeline.

Read `.claude/agents/agent-0-orchestrator.md`, then invoke it as a general-purpose agent via the Agent tool, passing the full file content as the prompt along with the issue number: $ARGUMENTS.

The orchestrator will run the full pipeline: specs → security → test cases → coding → review → tests → versioning → PR.
