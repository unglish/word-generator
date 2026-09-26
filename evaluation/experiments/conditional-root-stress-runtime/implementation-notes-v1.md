# Q09 runtime implementation notes before formal parity/capture

The registered plan remains unchanged. Source inspection clarified one fixture
boundary: public OTStressConfig selects named built-ins; it has no callback
registration API. The public OTConstraint type still accepts a two-argument
implementation, tested with generated shared-weight input. No private registry
mutation was added to inject a corrupting callback. Strict raw mark validation
remains present even where current public generation always supplies valid marks.

Initial fixture corrections concerned test assumptions only: trace:false omits
its trace property rather than retaining undefined; one active OT constraint
uses two Box-Muller draws, not four; and allomorph fixtures require their typed
phonological condition. These corrections preceded passing focused fixtures and
changed no runtime behavior or registered outcome criterion.

No formal delegation, candidate corpus, performance study, or default activation
has occurred. The published pure law/sampler and old proof artifacts remain
immutable; their accepted evidence is reused rather than rerun.
