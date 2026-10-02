# Linguistic distinctions for Q14a

Design notes, not a frozen policy. Sources inspected 2026-09-26 local time.

The model must distinguish a distributed vowel spelling from an independent
consonant spelling that happens to end in e. UFLI's VCe unit teaches a_e, i_e,
o_e, e_e and u_e, with both /uː/ and /juː/ readings for u_e; its same unit treats
_ce, _ge and exceptions separately. This supports modeling explicit sound/form
relations and exceptions instead of inferring a long vowel from any final e.
[UFLI unit outline](https://ufli.education.ufl.edu/foundations/toolbox/54-62/).

The English phonics screening specification uses a vowel letter, a consonant
letter and e as its split-digraph item shape. That is an assessment restriction,
not a complete descriptive grammar of English. It cannot justify silently
turning the existing one-or-two-coda-phone rule into a universal one-letter
constraint. Multi-letter consonants, clusters and exceptional readings require
explicit separate decisions in the generator policy.
[Assessment specification](https://www.gov.uk/government/publications/assessment-framework-for-the-development-of-the-year-1-phonics-screening-check/assessment-framework-for-the-development-of-the-year-1-phonics-screening-check).

The following are engineering inferences, not claims made by those sources:

1. Bind a split construction to the existing vowel phone rather than changing
   the phonological sequence to match a newly written pattern. The generator
   realizes an already selected pronunciation.
2. Preserve intervening consonant phones and ownership. An e owned by dge, ve,
   ce or another unit is not freely available; any truly joint function needs
   an explicitly licensed representation rather than reassignment by ancestry.
3. Do not introduce /j/ merely because u_e can have a /juː/ reading. A /j/ must
   already belong to the modeled phone sequence or be an explicit separately
   authorized phonological change.
4. Preserve alternative supported vowel spellings when formation is refused.
   A refusal does not discharge an already selected bare-vowel obligation;
   completion and alternative selection need separate recorded outcomes.
5. Distinguish root-final and syllable-final constructions from final assembled
   words. Affix changes can remove or alter a marker, so root validity cannot
   imply final pronunciation agreement.

Before registration, combine these constraints with an inventory of the frozen
control's actual edits and selected units. Report observational frequencies as
exploration; do not tune a probability to make those frequencies look improved.
