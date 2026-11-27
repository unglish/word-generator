# Per-attempt boundary and hiatus streams

Both revisions run the legacy-weighted engine. A shares the selection stream, B gives each root helper its own stream. The quality harness pairs all 200,000 development draws per revision by profile, seed and position. Each pair has the same word key. The forced bare monosyllable cohort must match byte for byte, including full traces.

The scoring probe follows the held-out-fold design in `archive/issue-555-selection-strategy` (`b1.py`). It uses the 45,904-entry spelling and phone reference from `archive/pr-553`, fits on folds 0–3, and compares to fold 4 peers of the same phone count (at least 30 entries). These are full-word guide scores, before the audited-root E1 scorer. Positional UCI single and pair scores rank the sum of position counts. The length-matched phone trigram ranks mean log probability with the archive's 0.1 smoothing. Rare means some adjacent pair occurs in four or fewer training words. Real and duplicate are measured on spelling, with repeats retained. KenLM is a character five-gram trained on the same four folds of spellings, with boundaries, measured in mean log10 probability per letter plus end marker. KenLM recognized every character in the sample.

The reference contains 36,747 training words and 9,157 held-out words. The pooled root-length breakdown combines all four protocol profiles and therefore oversamples forced monosyllables. Per-seed results are in `scores.json`.

## Matched output

| Profile | Pairs | Spelling or IPA changed | Full word or trace changed | Selected index changed |
| --- | --- | --- | --- | --- |
| lexicon-default | 50000 | 11 | 232 | 7 |
| lexicon-bare | 50000 | 6 | 256 | 4 |
| monosyllables-bare | 50000 | 0 | 0 | 0 |
| text-default | 50000 | 27 | 215 | 25 |

## Guide metrics, A → B

| Sample | Same-length peers available (draws) | Median pair pctile | Below pair p10 (%) | Median single pctile | Median trigram pctile | KenLM | Rare (%) | Real (%) | Duplicates (%) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lexicon-default | 49904 → 49904 | 26.672 → 26.672 | 24.070 → 24.068 | 46.631 → 46.632 | 6.118 → 6.118 | -1.194 → -1.194 | 7.620 → 7.618 | 3.438 → 3.438 | 3.426 → 3.426 |
| lexicon-bare | 49927 → 49927 | 28.488 → 28.488 | 23.330 → 23.328 | 51.364 → 51.364 | 5.870 → 5.870 | -1.269 → -1.269 | 6.466 → 6.466 | 5.558 → 5.558 | 9.988 → 9.988 |
| monosyllables-bare | 49869 → 49869 | 60.914 → 60.914 | 4.781 → 4.781 | 62.065 → 62.065 | 42.893 → 42.893 | -1.132 → -1.132 | 3.166 → 3.166 | 24.722 → 24.722 | 70.168 → 70.168 |
| text-default | 49797 → 49796 | 40.860 → 40.860 | 18.224 → 18.228 | 46.954 → 46.954 | 10.914 → 10.914 | -1.163 → -1.163 | 8.856 → 8.858 | 8.582 → 8.582 | 20.726 → 20.726 |
| root syllables 1 | 103761 → 103761 | 57.703 → 57.703 | 6.042 → 6.042 | 58.629 → 58.629 | 37.935 → 37.935 | -1.111 → -1.111 | 4.272 → 4.272 | 20.127 → 20.127 | 62.539 → 62.539 |
| root syllables 2 | 62959 → 62959 | 24.327 → 24.327 | 25.342 → 25.342 | 43.968 → 43.968 | 4.942 → 4.942 | -1.247 → -1.247 | 8.585 → 8.585 | 0.365 → 0.365 | 2.271 → 2.271 |
| root syllables 3 | 22486 → 22486 | 16.791 → 16.791 | 36.125 → 36.125 | 42.393 → 42.384 | 1.619 → 1.619 | -1.310 → -1.311 | 9.267 → 9.271 | 0.004 → 0.004 | 0.044 → 0.044 |
| root syllables 4+ | 10291 → 10290 | 11.810 → 11.810 | 46.371 → 46.375 | 40.949 → 40.949 | 0.337 → 0.337 | -1.360 → -1.360 | 10.600 → 10.590 | 0.000 → 0.000 | 0.000 → 0.000 |

## Retry distribution

The rejection audit checks 1,000 paired draws for each of five development seeds per profile. Retries equal attempts executed minus one.

| Profile | Mean attempts A → B | Exact A → B | Relaxed A → B | Fallback A → B |
| --- | --- | --- | --- | --- |
| lexicon-default | 2.9818 → 2.9818 | 4301 → 4301 | 558 → 558 | 141 → 141 |
| lexicon-bare | 2.9732 → 2.9732 | 4278 → 4278 | 570 → 570 | 152 → 152 |
| monosyllables-bare | 2.2954 → 2.2954 | 4510 → 4510 | 432 → 432 | 58 → 58 |
| text-default | 2.6348 → 2.6346 | 4442 → 4442 | 524 → 524 | 34 → 34 |

| Attempts executed | lexicon-default | lexicon-bare | monosyllables-bare | text-default |
| --- | --- | --- | --- | --- |
| 1 | 2620 → 2620 | 2636 → 2636 | 2729 → 2729 | 2140 → 2141 |
| 2 | 765 → 765 | 799 → 799 | 933 → 933 | 1036 → 1035 |
| 3 | 399 → 399 | 363 → 363 | 432 → 432 | 587 → 587 |
| 4 | 454 → 454 | 437 → 437 | 479 → 479 | 578 → 578 |
| 5 | 170 → 170 | 188 → 188 | 139 → 139 | 274 → 274 |
| 6 | 128 → 128 | 123 → 123 | 140 → 140 | 153 → 154 |
| 7 | 84 → 84 | 79 → 79 | 28 → 28 | 67 → 66 |
| 8 | 56 → 56 | 57 → 57 | 12 → 12 | 29 → 29 |
| 9 | 39 → 39 | 28 → 28 | 8 → 8 | 27 → 26 |
| 10 | 28 → 28 | 30 → 30 | 9 → 9 | 17 → 18 |
| 11 | 26 → 26 | 23 → 23 | 2 → 2 | 13 → 13 |
| 12 | 21 → 21 | 20 → 20 | 3 → 3 | 15 → 15 |
| 13 | 13 → 13 | 12 → 12 | 6 → 6 | 4 → 4 |
| 14 | 10 → 10 | 14 → 14 | 2 → 2 | 7 → 7 |
| 15 | 10 → 10 | 9 → 9 | 2 → 2 | 3 → 3 |
| 16 | 8 → 8 | 9 → 9 | 4 → 4 | 3 → 3 |
| 17 | 6 → 6 | 4 → 4 | 3 → 3 | 4 → 4 |
| 18 | 9 → 9 | 6 → 6 | 3 → 3 | 3 → 3 |
| 19 | 8 → 8 | 4 → 4 | 2 → 2 | 1 → 1 |
| 20 | 146 → 146 | 159 → 159 | 64 → 64 | 39 → 39 |

| Selected attempt (zero-based) | lexicon-default | lexicon-bare | monosyllables-bare | text-default |
| --- | --- | --- | --- | --- |
| 0 | 2670 → 2670 | 2692 → 2693 | 2751 → 2751 | 2148 → 2149 |
| 1 | 786 → 786 | 820 → 820 | 951 → 951 | 1039 → 1038 |
| 2 | 410 → 410 | 376 → 376 | 440 → 440 | 588 → 588 |
| 3 | 459 → 459 | 447 → 447 | 482 → 482 | 579 → 579 |
| 4 | 182 → 182 | 194 → 195 | 140 → 140 | 275 → 275 |
| 5 | 133 → 133 | 129 → 128 | 141 → 141 | 157 → 158 |
| 6 | 87 → 87 | 83 → 83 | 29 → 29 | 72 → 71 |
| 7 | 59 → 59 | 59 → 59 | 13 → 13 | 29 → 29 |
| 8 | 42 → 42 | 31 → 31 | 9 → 9 | 29 → 28 |
| 9 | 34 → 34 | 36 → 35 | 9 → 9 | 18 → 19 |
| 10 | 28 → 28 | 24 → 24 | 2 → 2 | 16 → 16 |
| 11 | 24 → 24 | 24 → 24 | 4 → 4 | 16 → 16 |
| 12 | 15 → 15 | 13 → 13 | 6 → 6 | 4 → 4 |
| 13 | 12 → 12 | 18 → 18 | 3 → 3 | 7 → 7 |
| 14 | 13 → 13 | 11 → 11 | 2 → 2 | 4 → 4 |
| 15 | 9 → 9 | 9 → 9 | 4 → 4 | 4 → 4 |
| 16 | 7 → 7 | 8 → 8 | 3 → 3 | 5 → 5 |
| 17 | 13 → 13 | 11 → 11 | 3 → 3 | 3 → 3 |
| 18 | 10 → 10 | 6 → 6 | 2 → 2 | 2 → 2 |
| 19 | 7 → 7 | 9 → 9 | 6 → 6 | 5 → 5 |

## Unfiltered paired words (first draw of every seed stream)

| Profile | Seed / draw | Before | After |
| --- | --- | --- | --- |
| lexicon-default | 69212153 / 0 | sontoarm /ˈsɔn.tʰəʊrm/ | sontoarm /ˈsɔn.tʰəʊrm/ |
| lexicon-default | 101601885 / 0 | insmilled /ˌɪnˈsmɪld/ | insmilled /ˌɪnˈsmɪld/ |
| lexicon-default | 3921817393 / 0 | dear /dɛr/ | dear /dɛr/ |
| lexicon-default | 3948943232 / 0 | ceddetive /ˌsɛdˈɛt.ɪv/ | ceddetive /ˌsɛdˈɛt.ɪv/ |
| lexicon-default | 2089697863 / 0 | mened /mi:nd/ | mened /mi:nd/ |
| lexicon-bare | 2380207674 / 0 | oind /ɔɪnd/ | oind /ɔɪnd/ |
| lexicon-bare | 772709128 / 0 | annimashan /əˈnɪm.æʃ.ən/ | annimashan /əˈnɪm.æʃ.ən/ |
| lexicon-bare | 1304238451 / 0 | gind /gɪnd/ | gind /gɪnd/ |
| lexicon-bare | 1696751198 / 0 | ashil /ˈɑʃ.əl/ | ashil /ˈɑʃ.əl/ |
| lexicon-bare | 1498885173 / 0 | brasfiert /ˈbræs.fi:rt/ | brasfiert /ˈbræs.fi:rt/ |
| monosyllables-bare | 462530651 / 0 | beat /bɛt/ | beat /bɛt/ |
| monosyllables-bare | 62358955 / 0 | heap /hɛp/ | heap /hɛp/ |
| monosyllables-bare | 3297327738 / 0 | slite /slaɪt/ | slite /slaɪt/ |
| monosyllables-bare | 2001884366 / 0 | rale /reɪl/ | rale /reɪl/ |
| monosyllables-bare | 2353354178 / 0 | bought /bɔt/ | bought /bɔt/ |
| text-default | 4167471042 / 0 | yecringly /ˈjɛ.kʰrɪŋ.li:/ | yecringly /ˈjɛ.kʰrɪŋ.li:/ |
| text-default | 2666001996 / 0 | missageal /ˌmɪs.səˈgi:l/ | missageal /ˌmɪs.səˈgi:l/ |
| text-default | 3562318933 / 0 | yotorsto /jɔˈtʰɔrˌstəʊ/ | yotorsto /jɔˈtʰɔrˌstəʊ/ |
| text-default | 1999736106 / 0 | sloocted /ˈslukt.ɪd/ | sloocted /ˈslukt.ɪd/ |
| text-default | 1665836705 / 0 | ock /ʌk/ | ock /ʌk/ |

## First 20 changed spellings, in protocol order

| Profile | Seed / draw | Before | After |
| --- | --- | --- | --- |
| lexicon-default | 69212153 / 3025 | spathinlas /ˈspɑð.hənˌlɑz/ | bratwegners /ˈbræt.wɛg.nɚz/ |
| lexicon-default | 69212153 / 4696 | lerpoofcutlo /lɛrˈpʰuf.kʰət.lɑ/ | sadninmucter /sədˈnɪn.mək.tɚ/ |
| lexicon-default | 101601885 / 1483 | actilprids /əkˈtʰɪl.prɪdz/ | umsbilmases /ˈʊms.bəl.məs.əz/ |
| lexicon-default | 101601885 / 2620 | vapitmikely /ˈvɑ.pʰɪt.maɪk.li:/ | divitrifsa /dɪ.vɪtˈrɪf.sə/ |
| lexicon-default | 101601885 / 4930 | yitfeadzorly /jɪtˈfɛd.zɚ.li:/ | yitfeadmorly /jɪtˈfɛd.mɚ.li:/ |
| lexicon-default | 101601885 / 6684 | elritrectury /ˈɛl.rət.rəkt.ʊ.ri:/ | elritrectoby /ˈɛl.rət.rəkt.ɔ.bi:/ |
| lexicon-default | 3921817393 / 851 | modrimstiped /ˈmʌd.rəms.tɪpt/ | modrimspaled /ˈmʌd.rəms.pæld/ |
| lexicon-default | 3921817393 / 4876 | baplanyutkeca /ˈbɑp.lənˌjʊt.kɪ.kə/ | baplanyutkepa /ˈbɑp.lənˌjʊt.kɪ.pə/ |
| lexicon-default | 3948943232 / 7130 | atrimbeg /əˈtʰrɪmˌbɛg/ | ibbarmsot /əˈbærm.sət/ |
| lexicon-default | 3948943232 / 8490 | inlatrinelind /ˌɪn.ləˈtʰraɪn.lɪnd/ | inviptiplacs /ˌɪn.vɪpˈtʰɪ.pləks/ |
| lexicon-default | 2089697863 / 1690 | methficras /mɪθˈfɪk.rəs/ | rafnictan /ˌrɑfˈnɪk.tʰən/ |
| lexicon-bare | 2380207674 / 8526 | froglitsa /ˌfrɑgˈlɪt.sə/ | froglitha /ˌfrɑgˈlɪt.θə/ |
| lexicon-bare | 772709128 / 5087 | grudginacs /ˈgrʊdˌdʒaɪ.nəks/ | clacnadent /kʰləkˈnæˌdɛnt/ |
| lexicon-bare | 772709128 / 6799 | tirzelmpic /tʰərˈzɛlm.pɪk/ | ditnimstac /ˈdɪtˌnɪms.tək/ |
| lexicon-bare | 772709128 / 8961 | flabbapto /fləˈbæpˌtʰəʊ/ | flabbapcha /fləˈbæp.tʃə/ |
| lexicon-bare | 1696751198 / 595 | wuscurplaquy /ˈwʊs.kɚpˌlɑ.kwi:/ | badnatradewa /ˈbɑd.nɑtˌreɪd.wə/ |
| lexicon-bare | 1696751198 / 997 | smonturzin /ˈsmɔn.tʰər.zɪn/ | bretcalcos /ˈbrɛt.kəl.kəz/ |
| text-default | 4167471042 / 271 | watlamfoambory /wətˌlæmˈfəʊmb.ɔr.i:/ | funshelbomory /ˌfʌns.hɪlˈbəʊm.ɔr.i:/ |
| text-default | 4167471042 / 307 | eleamchetterian /ɛˌlɛmˌtʃɛtˈɛr.i:.ən/ | ackikyihirnian /əˌkʰɪk.jɪˈhɚn.i:.ən/ |
| text-default | 4167471042 / 3599 | rewitennealolt /ˌrɪ.waɪt.ɪˈnɛ.ləʊlt/ | reribavinirce /ˌrɪ.rɪˌbɑˈvɪ.naɪrs/ |

## Largest UCI pair percentile moves in each direction

| Profile | Seed / draw | Before | After | Pair percentile A → B | Selected attempt A → B |
| --- | --- | --- | --- | --- | --- |
| text-default | 1665836705 / 8475 | chillecans /ˌtʃɪˈlɛ.kʰənz/ | ubramocks /əbˈræ.mɔks/ | 68.10 → 1.85 | 2 → 1 |
| text-default | 4167471042 / 8148 | hatritornts /ˈheɪ.trə.tɚnts/ | brocraflose /ˈbrɔk.rəf.ləʊs/ | 43.35 → 6.83 | 9 → 2 |
| lexicon-default | 3921817393 / 851 | modrimstiped /ˈmʌd.rəms.tɪpt/ | modrimspaled /ˈmʌd.rəms.pæld/ | 35.56 → 11.23 | 2 → 2 |
| text-default | 1999736106 / 8083 | slalezalered /ˈsleɪl.zə.lɚd/ | ibechternded /ˈɪˌbɛʃ.tɚnd.ɪd/ | 22.08 → 0.72 | 1 → 0 |
| lexicon-bare | 2380207674 / 8526 | froglitsa /ˌfrɑgˈlɪt.sə/ | froglitha /ˌfrɑgˈlɪt.θə/ | 22.30 → 9.16 | 7 → 7 |
| lexicon-bare | 772709128 / 6799 | tirzelmpic /tʰərˈzɛlm.pɪk/ | ditnimstac /ˈdɪtˌnɪms.tək/ | 0.18 → 53.60 | 19 → 3 |
| lexicon-default | 101601885 / 2620 | vapitmikely /ˈvɑ.pʰɪt.maɪk.li:/ | divitrifsa /dɪ.vɪtˈrɪf.sə/ | 1.98 → 46.04 | 5 → 6 |
| text-default | 4167471042 / 5601 | unerrigmictiemb /ˌʌnˈɛˌrɪg.mɪkt.i:mb/ | untrotorethkerk /ˌʌn.tʰrʌˈtʰɑ.rɛθ.kɚk/ | 21.51 → 55.91 | 3 → 6 |
| text-default | 1999736106 / 9530 | ineradhipand /ˌɪnˈɛ.rɑd.hɪ.pənd/ | invalichtidid /ˌɪnˈvɑ.lətʃ.tɪ.dɪd/ | 41.97 → 70.47 | 0 → 1 |
| lexicon-bare | 1696751198 / 997 | smonturzin /ˈsmɔn.tʰər.zɪn/ | bretcalcos /ˈbrɛt.kəl.kəz/ | 3.24 → 30.58 | 9 → 4 |

These are the selected attempts. A changed winning index can expose a different plan in the public trace. The full stage snapshots, structural events, repairs, grapheme selections, and morphology records are in `mover-traces.json.gz`.

| Profile / seed / draw | Generated root A | Generated root B |
| --- | --- | --- |
| text-default / 1665836705 / 8475 | tʃɪ.lə.kənz | ʌb.ræ.mɔks (sspBoundaryDrop@1) |
| text-default / 4167471042 / 8148 | hə.trə.tɚnts | brɔk.rəf.ləʊs (sspBoundaryDrop@1) |
| lexicon-default / 3921817393 / 851 | mʌd.rəms.tɪp (sspBoundaryDrop@1) | mʌd.rəms.pæl (sspBoundaryDrop@1) |
| text-default / 1999736106 / 8083 | sleɪl.zə.lɚ | ɪ.bɛʃ.tɚnd (boundaryDrop@1) |
| lexicon-bare / 2380207674 / 8526 | frɑg.lət.səʊ (sspBoundaryDrop@1) | frɑg.lət.θu (sspBoundaryDrop@1) |
| lexicon-bare / 772709128 / 6799 | tɪr.zəlm.pɛk (sspBoundaryDrop@1) | dɪt.nɪms.tək (risingCodaBoundaryDrop@1) |
| lexicon-default / 101601885 / 2620 | və.pɪt.maɪk.li: (sspBoundaryDrop@2) | dɪ.vɪt.rəf.sə (sspBoundaryDrop@2) |
| text-default / 4167471042 / 5601 | ɛ.rɪg.mɪkt.i:mb (sspBoundaryDrop@2) | trʌ.tə.rɛθ.kɚk |
| text-default / 1999736106 / 9530 | ə.rɑd.hɪ.pənd (sspBoundaryDrop@2) | vɑ.lətʃ.tɪ.dɪd |
| lexicon-bare / 1696751198 / 997 | smɔn.tər.zi:n | brɛt.kəl.kɔz (sspBoundaryDrop@1) |
