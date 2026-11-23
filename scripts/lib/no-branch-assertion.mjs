function booleanLiteral(node) {
  return node?.type === "Literal" && typeof node.value === "boolean";
}

function booleanBinding(sourceCode, condition, name) {
  for (let scope = sourceCode.getScope(condition); scope; scope = scope.upper) {
    const variable = scope.set.get(name);
    if (!variable) continue;
    const writes = variable.references.filter(reference => reference.isWrite());
    return writes.length > 0 && writes.every(reference => booleanLiteral(reference.writeExpr));
  }
  return false;
}

function branchAssertion(branch) {
  const statement = branch?.type === "BlockStatement" && branch.body.length === 1
    ? branch.body[0]
    : branch;
  if (statement?.type !== "ExpressionStatement") return undefined;
  const assertion = statement.expression;
  if (assertion.type !== "CallExpression" || !booleanLiteral(assertion.arguments[0])) return undefined;
  const matcher = assertion.callee;
  if (matcher.type !== "MemberExpression" || matcher.computed || matcher.property.type !== "Identifier") return undefined;
  if (!["toBe", "toEqual", "toStrictEqual"].includes(matcher.property.name)) return undefined;
  const negated = matcher.object.type === "MemberExpression" && !matcher.object.computed
    && matcher.object.property.type === "Identifier" && matcher.object.property.name === "not";
  const expect = negated ? matcher.object.object : matcher.object;
  if (expect.type !== "CallExpression" || expect.callee.type !== "Identifier" || expect.callee.name !== "expect") return undefined;
  const actual = expect.arguments[0];
  if (actual?.type !== "Identifier") return undefined;
  return { name: actual.name, value: negated ? !assertion.arguments[0].value : assertion.arguments[0].value, node: assertion };
}

export const noBranchAssertion = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      proven: "This branch already proves the assertion. Assert the required result outside the branch, or use findExample from src/test-support/find-example.ts to require a generated witness.",
    },
  },
  create(context) {
    return {
      IfStatement({ test, consequent, alternate }) {
        const negated = test.type === "UnaryExpression" && test.operator === "!";
        const checked = negated ? test.argument : test;
        if (checked.type !== "Identifier") return;
        if (!booleanBinding(context.sourceCode, test, checked.name)) return;
        for (const [branch, value] of [[consequent, !negated], [alternate, negated]]) {
          const assertion = branchAssertion(branch);
          if (assertion?.name === checked.name && assertion.value === value) {
            context.report({ node: assertion.node, messageId: "proven" });
          }
        }
      },
    };
  },
};
