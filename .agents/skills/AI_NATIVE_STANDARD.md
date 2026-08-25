# AI-Native Design Standard

## The Rule

Xenboox is AI-native, not SaaS. Every design decision must pass this test:
"Does this make the AI more capable, or does it add SaaS-style complexity?"

## Core Principles

### 1. The AI IS the Product

- Not a feature, not an assistant, not a chatbot
- The AI handles the work. Humans make decisions.
- Users talk, AI acts. Not users click, AI responds.

### 2. Proactive, Not Reactive

- AI surfaces what needs attention — not waiting for user to find it
- AI suggests next actions — not waiting for user to ask
- AI explains what it's doing — not just showing results

### 3. Specialized Agents, Not Generic AI

- 19 agents in 3-tier hierarchy
- Each agent has a specific role and expertise
- Agents communicate through typed state, not direct calls

### 4. Humans Make Decisions

- AI does the work, humans approve
- Clear decision cards with yes/no
- Confidence indicators show AI certainty

### 5. 5 Surfaces for Visibility

| Surface         | Purpose                      | AI-Native Pattern                       |
| --------------- | ---------------------------- | --------------------------------------- |
| Command Center  | Conversational AI interface  | Chat-first, AI handles ALL actions      |
| Activity Hub    | Human-in-the-loop queue      | Decision cards, approval flows          |
| Financial Pulse | AI-narrated financial health | AI explains what numbers mean           |
| Ledger          | Record of truth              | When you need to look at books directly |
| Operations      | Money in, money out          | AI manages cash flow, you approve       |

## SaaS Anti-Patterns (Never Build)

- Complex navigation menus (use 5 surfaces instead)
- Multi-step forms for data entry (AI handles this)
- Manual workflows that AI should handle
- Dashboard overload with 20+ charts
- Settings pages with 50+ toggles
- Users clicking buttons to perform actions (AI performs actions)
- Forms for data entry (AI handles data entry, humans verify)

## Visual Language for AI-Native

| Element        | AI-Native Pattern                                            |
| -------------- | ------------------------------------------------------------ |
| Loading States | Agent thinking visualization (dots, waves, pulse)            |
| Success States | AI confidence confirmation (glow, checkmark with confidence) |
| Error States   | Agent explaining what went wrong and next steps              |
| Empty States   | AI suggesting what to do next                                |
| Progress       | Agent activity timeline (what it's doing, what's done)       |

## AI-Native Design Patterns

### Confidence Indicators

Visual representation of AI confidence (0-1):

- Glow intensity based on confidence level
- Pulse animation for active processing
- Opacity for confidence level
- Color coding (green = high, yellow = medium, red = low)

### Agent Activity

Real-time visualization of agent work:

- Dots for thinking
- Waves for processing
- Progress bars for long operations
- Timeline for multi-step workflows

### Decision Cards

Human-in-the-loop approval UI:

- Clear yes/no options
- Confidence score displayed
- Context about what AI recommends
- Easy to approve or reject

### Narrative Flow

AI explains what it's doing:

- Step-by-step progress
- What AI found
- What AI recommends
- What AI needs from user

### Proactive Alerts

AI surfaces what needs attention:

- Anomalies detected
- Opportunities identified
- Risks flagged
- Actions recommended

## 5-Surface Design Patterns

### Command Center

- Chat-first interface
- AI handles ALL create/update/approve actions
- Conversation sidebar for history
- Thinking steps for transparency

### Activity Hub

- Decision cards with clear yes/no
- Priority-based queue
- Batch approval options
- Progress indicators

### Financial Pulse

- AI-narrated charts
- Confidence indicators on predictions
- Trend explanations
- Action recommendations

### Ledger

- Clean data display
- Search-focused
- Audit trail
- Entity-scoped views

### Operations

- Approval queues
- Status flows
- AI-managed cash flow
- Human approval points

## Implementation Checklist

When designing any UI:

- [ ] Does this make the AI more capable?
- [ ] Does this add SaaS-style complexity?
- [ ] Is AI confidence visually represented?
- [ ] Is agent activity visualized?
- [ ] Are decision cards clear and prominent?
- [ ] Does AI explain what it's doing?
- [ ] Are proactive alerts present?
- [ ] Are loading states agent-aware?
- [ ] Are error states helpful?
- [ ] Are empty states actionable?
- [ ] Does progress show agent activity?
- [ ] Is this AI-native, not SaaS?

## Examples

### Bad (SaaS Pattern)

```tsx
// Complex navigation menu
<nav>
  <MenuItem>Dashboard</MenuItem>
  <MenuItem>Invoices</MenuItem>
  <MenuItem>Customers</MenuItem>
  <MenuItem>Reports</MenuItem>
  <MenuItem>Settings</MenuItem>
</nav>

// Multi-step form for data entry
<Form>
  <Step1>Enter invoice details</Step1>
  <Step2>Add line items</Step2>
  <Step3>Review and submit</Step3>
</Form>
```

### Good (AI-Native Pattern)

```tsx
// Chat-first interface
<CommandCenter>
  <ChatInput placeholder="Ask AI to create an invoice..." />
  <ConversationHistory />
</CommandCenter>

// Decision card
<DecisionCard>
  <AIRecommendation>AI recommends approving this payment</AIRecommendation>
  <Confidence score={0.94} />
  <Actions>
    <Approve>Approve</Approve>
    <Reject>Reject</Reject>
  </Actions>
</DecisionCard>
```

## References

- PRD.md — Product requirements
- AGENTS.md — Agent architecture
- ARCHITECTURE.md — System architecture
- OPERATING_STANDARD.md — Employee operating standard
