# Product Definition

## Problem

Operators lose time translating spoken intent into structured tasks across multiple tools.

## Solution

GXEON Voice Operations Agent listens to a spoken mission, transcribes it with AssemblyAI, converts it into a structured execution plan, applies an approval/safety gate, executes permitted tools, and returns evidence.

## MVP Demo

Spoken instruction:
"GX, scan our current agent-work channels and tell me which one has a paid task available right now."

Expected pipeline:
- live transcription
- mission classification
- tool/radar execution
- result synthesis
- evidence summary
- voice response

## Architecture

```text
Microphone
   |
AssemblyAI Realtime STT
   |
Mission Parser
   |
Policy / Approval Gate
   |
GXEON Orchestrator
   |-- Web Radar
   |-- GitHub
   |-- Agent Marketplaces
   |-- Internal APIs
   |
Evidence Collector
   |
Response Composer
   |
Voice / UI Output
```

## Judging alignment

### Application of Technology
AssemblyAI is central to the interaction loop, not decorative.

### Presentation
Single clear operator flow with visible transcript, plan, execution state, and evidence.

### Business Value
Voice reduces friction for nontechnical operators and enables hands-free agent operations.

### Originality
Combines real-time voice with an evidence-driven autonomous operations layer rather than a generic voice chatbot.
