/** Probability kernel for opt-in initial spelling-sequence conditioning. */
export interface SequenceEdge<State, Choice> {
  next: State;
  choice: Choice;
  logProbability: number;
}

export interface SequenceModel<State, Choice> {
  length: number;
  initial: State;
  /** Must distinguish every state that can change future support or mass. */
  key(state: State): string;
  edges(index: number, state: State): readonly SequenceEdge<State, Choice>[];
  accepts(state: State): boolean;
}

interface Node<State, Choice> {
  state: State;
  edges: readonly SequenceEdge<State, Choice>[];
  logMass: number;
}

export function logSum(values: readonly number[]): number {
  const maximum = values.reduce((a, b) => Math.max(a, b), -Infinity);
  if (maximum === -Infinity) return maximum;
  return maximum + Math.log(values.reduce((sum, value) => sum + Math.exp(value - maximum), 0));
}

export function planConditionedSequence<State, Choice>(model: SequenceModel<State, Choice>) {
  if (!Number.isSafeInteger(model.length) || model.length < 0) throw new Error("Invalid sequence length");
  const layers: Map<string, Node<State, Choice>>[] = [new Map([
    [model.key(model.initial), { state: model.initial, edges: [], logMass: -Infinity }],
  ])];
  let edgeCount = 0;
  for (let index = 0; index < model.length; index++) {
    const nextLayer = new Map<string, Node<State, Choice>>();
    for (const node of layers[index].values()) {
      node.edges = model.edges(index, node.state).filter(edge => {
        if (Number.isNaN(edge.logProbability) || edge.logProbability > 0) throw new Error("Invalid edge probability");
        return edge.logProbability !== -Infinity;
      });
      for (const edge of node.edges) {
        const key = model.key(edge.next);
        if (!nextLayer.has(key)) nextLayer.set(key, { state: edge.next, edges: [], logMass: -Infinity });
        edgeCount++;
      }
    }
    layers.push(nextLayer);
  }
  for (const node of layers[model.length].values()) node.logMass = model.accepts(node.state) ? 0 : -Infinity;
  for (let index = model.length - 1; index >= 0; index--) {
    for (const node of layers[index].values()) {
      node.logMass = logSum(node.edges.map(edge =>
        edge.logProbability + layers[index + 1].get(model.key(edge.next))!.logMass));
    }
  }
  const logMass = layers[0].get(model.key(model.initial))!.logMass;

  function choices(index: number, state: State) {
    const node = layers[index]?.get(model.key(state));
    if (!node || index === model.length) throw new Error("No selection at this state");
    if (node.logMass === -Infinity) return [];
    return node.edges.flatMap(edge => {
      const continuation = layers[index + 1].get(model.key(edge.next))!.logMass;
      if (continuation === -Infinity) return [];
      return [{ ...edge, logConditionalProbability: edge.logProbability + continuation - node.logMass }];
    });
  }

  function draw(index: number, state: State, roll: number) {
    if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error("Roll must be in [0, 1)");
    const supported = choices(index, state);
    if (supported.length === 0) throw new Error("No legal sequence continuation");
    const logRoll = Math.log(roll);
    let cumulative = -Infinity;
    for (const edge of supported) {
      cumulative = logSum([cumulative, edge.logConditionalProbability]);
      if (logRoll < cumulative) return edge;
    }
    // A valid roll can exceed a rounded cumulative total by a few ulps.
    return supported[supported.length - 1];
  }
  return { logMass, choices, draw, states: layers.reduce((sum, layer) => sum + layer.size, 0), edges: edgeCount };
}
