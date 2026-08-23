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
  }
];
