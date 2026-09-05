export interface Sample {
  id: string;
  title: string;
  source: string;
  markdown: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'gemini-chat',
    title: 'Gemini Chat (Loose Lists & Math)',
    source: 'Google Gemini 1.5/2.0 Chat Export',
    markdown: `# Machine Learning Pipeline Overview

Here are the key stages for building our predictive model:

* **Data Ingestion**: Streaming events from Pub/Sub and batch sources.

* **Feature Engineering**: Transforming raw variables into normalized vectors.

  * Imputation of missing values using median techniques.

  * Polynomial expansion for non-linear interactions.

* **Model Training**: Utilizing gradient boosted trees with early stopping.

* **Evaluation & Metrics**:

  1. Compute ROC-AUC and Precision-Recall curves.

  2. Calculate cross-entropy loss across 5 validation folds.

  3. Benchmark inference latency under P99 load.

### Mathematical Formulation

The loss function with L2 regularization is defined as:

\\[
\\mathcal{L}(\\theta) = -\\frac{1}{N} \\sum_{i=1}^{N} \\left[ y_i \\log(\\hat{y}_i) + (1-y_i) \\log(1-\\hat{y}_i) \\right] + \\frac{\\lambda}{2} \\|\\theta\\|^2
\\]

Where the activation function is \\( \\sigma(z) = \\frac{1}{1 + e^{-z}} \\).

###Important Guidelines

> **Note:** Always normalize continuous features before passing them to gradient-based optimizers to ensure fast convergence.

> **Warning:** Check for data leakage between training and validation splits.

Here is an example Python snippet:

\`\`\`python
# Example training loop with early stopping
def train_epoch(model, dataloader, optimizer):
    # * This bullet inside code must NOT be changed!
    # * Step 2 inside code comments
    for batch_x, batch_y in dataloader:
        optimizer.zero_grad()
        loss = model.compute_loss(batch_x, batch_y)
        loss.backward()
        optimizer.step()
\`\`\`

** Key Takeaway **: Modular architectures ensure maintainability and high reproducibility.
`
  },
  {
    id: 'chatgpt-plan',
    title: 'ChatGPT Project Plan & Task List',
    source: 'ChatGPT 4o Export',
    markdown: `## Svelte Web Application Roadmap

Below is the implementation checklist for the project:

- [ ] Initialize Vite with Svelte 5 and TypeScript

- [ ] Implement pure transformation engine

  - [ ] Support nested bullet tightening

  - [ ] Add LaTeX normalization

- [ ] Build side-by-side split screen UI

- [ ] Add unit test suite with 100% rule coverage

- [ ] Configure GitHub Pages automatic deployment

### Architecture Decisions

* **Client-side only**: Zero backend servers required.

* **Local Storage**: Persist user settings and last edited text.

* **Performance**: Real-time debounce transforms on input.

> **Tip:** You can use Obsidian hotkeys like \`Cmd/Ctrl + Enter\` to quickly toggle task list items.

| Component | Responsibility | Status |
|---|---|---|
| Cleaner Engine | Text transformation & AST parsing | Ready |
| Preview Panel | Obsidian-style rendered HTML | Ready |
| Diff Viewer | Line-by-line visual delta | Ready |
`
  },
  {
    id: 'claude-research',
    title: 'Claude Research Summary',
    source: 'Claude 3.5 Sonnet Export',
    markdown: `# Research Synthesis: Quantum Algorithms

###Core Findings

* **Shor's Algorithm**: Demonstrates polynomial time integer factorization.

* **Grover's Algorithm**: Provides quadratic speedup for unstructured database search queries.

* **VQE (Variational Quantum Eigensolver)**: Hybrid classical-quantum algorithm for molecular ground state estimation.

> **Important:** Quantum error correction (surface codes) remains the critical bottleneck for fault-tolerant scaling.

The Grover search operator is represented by:

\\[
G = (2 |\\psi\\rangle \\langle\\psi| - I) O
\\]

Let \\( |s\\rangle \\) denote the uniform superposition state.

** Final Conclusion **: Near-term NISQ applications focus on chemistry simulations and quantum annealing.
`
  },
  {
    id: 'gemini-architecture-matrix',
    title: 'Gemini Architecture Matrix & Tables',
    source: 'Google Gemini Architecture Export',
    markdown: `# The Partial Hydration Dilemma

The partial hydration dilemma is the architectural deadlock between Domain-Driven Design's mandate for **aggregate integrity** and relational database **access-path efficiency**.

# The Failure Modes of Naive Solutions

\`\`\`
+--------------------------+-------------------------------------------------------------+
| Naive Workaround         | Failure Mechanism                                           |
+--------------------------+-------------------------------------------------------------+
| Nullable Domain Fields   | Fields not fetched are set to null. Methods must guess      |
|                          | whether an attribute is genuinely null or simply omitted,   |
|                          | destroying the entity's ability to protect invariants.      |
+--------------------------+-------------------------------------------------------------+
| Dynamic Proxies &        | Property getters trigger secondary database queries on      |
| Lazy-Loading             | access. This creates hidden I/O within domain logic, N+1    |
|                          | query cascades, and breaks offline unit testability.        |
+--------------------------+-------------------------------------------------------------+
| Specific "Hydrated"      | Creating PartialMerchant, BasicMerchant, and FullMerchant   |
| Variations               | causes an exponential explosion of classes with duplicate   |
|                          | business logic and unclear responsibilities.                |
+--------------------------+-------------------------------------------------------------+
\`\`\`

# Architectural Trade-Off Matrix

\`\`\`
+----------------------------+-----------------------+---------------------+-------------------------+
| Approach                   | Aggregate Integrity   | Query Efficiency    | Complexity Cost         |
+----------------------------+-----------------------+---------------------+-------------------------+
| Classical Repository       | High                  | Very Low            | Low                     |
| (Full Hydration)           | (No partial state)    | (SELECT * everywhere)| (Simple abstractions)   |
+----------------------------+-----------------------+---------------------+-------------------------+
| CQRS Separation            | High                  | High                | Medium                  |
| (Bypass for Reads)         | (Entities for writes) | (Targeted DTO reads)| (Two data paths)        |
+----------------------------+-----------------------+---------------------+-------------------------+
| Aggregate Decomposition    | High                  | High                | Medium                  |
| (Shared Table Pattern)     | (Fully valid models)  | (Narrow projections)| (Multiple entity models)|
+----------------------------+-----------------------+---------------------+-------------------------+
| Task-Specific Commands     | High                  | High                | Medium                  |
| (Narrow Command Models)    | (Scoped invariants)   | (Single-row slices) | (Granular repositories) |
+----------------------------+-----------------------+---------------------+-------------------------+
| Functional Transition      | High                  | Maximum             | Low/Medium              |
| (Pure Functions)           | (Explicit arguments)  | (Ad-hoc projections)| (No OOP encapsulation)  |
+----------------------------+-----------------------+---------------------+-------------------------+
\`\`\`
`
  }
];
