# Linguistic constraints for Q14b

Reviewed 2026-09-27. These notes inform the design; they are not a frozen
sampling policy or a claim that all English exceptions are enumerated.

The Department for Education's [English Appendix 1: Spelling](https://www.gov.uk/government/uploads/system/uploads/attachment_data/file/239784/English_Appendix_1_-_Spelling.pdf),
printed pages 6–7, describes /s/ represented by c before e/i/y, and k for /k/
in those letter contexts. It describes g as one representation of /dʒ/ before
e/i/y, while j occurs before a/o/u. These are statements about letters, not a
phonological front-vowel class. They support fixing the witnessed /s/ → ca
selection. The teaching guidance is not an exhaustive lexical decoder.

A categorical reverse inference about g would be wrong. Cambridge's
[get pronunciation](https://dictionary.cambridge.org/pronunciation/english/get)
records initial /ɡ/ before written e. This directly contradicts treating every
hard-g-before-e occurrence as impossible English. The existing bundled reading
metadata forbids e/i/y after hard g; that is a conservative generation policy,
not a universal linguistic truth. The [submitted parliamentary evidence](https://publications.parliament.uk/pa/cm200001/cmselect/cmeduemp/33/33ap07.htm),
paragraph 19(c), also contrasts hard and soft g words. It is a submitted
memorandum, not an authoritative exhaustive spelling standard.

## Consequences for the implementation contract

- Separate productive spelling preferences from impossible readings and
  lexically supported alternatives. Define the intended nonce-word mode
  explicitly; do not relabel all departures from a preferred pattern defects.
- Report hard-g-before-front-letter cases separately from incompatible soft
  c/g cases until a lexical/reading policy establishes their status.
- Never infer a written first letter solely from the following phoneme's place
  of articulation. The preserved /æ/ → a witness makes that failure concrete.
- Changing the hard-g reading table affects existing completion and repair
  certificates. Any such change needs its own declared scope, compatibility
  evidence and aggregate side-effect measurements, not a silent data correction.
- The sources do not specify generator weights, RNG consumption or search
  bounds. Those remain engineering decisions to register prospectively.
