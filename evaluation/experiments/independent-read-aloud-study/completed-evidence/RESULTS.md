# Q23 completed synthetic study evidence

Measured source: `65c6b76179b9b5067128e69a489ba7debb949230`. Exact control: `37e9054591bd9c54ec3b3d144ae11d3122e049c0` on `depatched/read-aloud-control-37e9054`.

All 20,400 registered datasets, 999 replicates per dataset and 244,555,200 contrasts completed and were independently reconstructed. The registered calibration decision **passed**; 0 registered contexts failed. Execution completion is separate from passing calibration.

All 28 original repository/review commands and 12 unchanged native timing runs completed: 26 commands passed and 2 failed. Original failures remain failures. The median candidate/control ratio from the original rounded throughput logs is 0.992794016295; it does not establish generator-quality gain or precise latent throughput.

These studies add measurement infrastructure. No actual readers, listeners, human recordings or independent coder judgments were collected. No generated-output benefit, universal interval coverage, current-main certification or adoption decision follows from synthetic calibration.

## Every calibration and diagnostic context

Coverage rates use all 1,200 datasets per scenario, including withheld intervals. Available-only coverage is separately retained in the complete JSON summaries. Width and directional detection are descriptive and introduce no new acceptance gate.

| Scenario | Role | Stratum | Cohort or metric | Available / 1200 | Full-population covered / 1200 | Coverage Wilson lower | Zero rejections / 1200 | Rejection Wilson upper | Registered gate |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| iid-small | calibration | pooled | intended_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | pass |
| iid-small | calibration | pooled | intended_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | pass |
| iid-small | calibration | pooled | accepted_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | pass |
| iid-small | calibration | pooled | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | pass |
| iid-small | calibration | short | intended_phones | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | diagnostic or exploratory |
| iid-small | calibration | short | intended_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| iid-small | calibration | short | accepted_phones | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | diagnostic or exploratory |
| iid-small | calibration | short | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| iid-small | calibration | long | intended_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| iid-small | calibration | long | intended_phones_and_stress | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| iid-small | calibration | long | accepted_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| iid-small | calibration | long | accepted_phones_and_stress | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| crossed-null | calibration | pooled | intended_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | pass |
| crossed-null | calibration | pooled | intended_phones_and_stress | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | pass |
| crossed-null | calibration | pooled | accepted_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | pass |
| crossed-null | calibration | pooled | accepted_phones_and_stress | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | pass |
| crossed-null | calibration | short | intended_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| crossed-null | calibration | short | intended_phones_and_stress | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| crossed-null | calibration | short | accepted_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| crossed-null | calibration | short | accepted_phones_and_stress | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| crossed-null | calibration | long | intended_phones | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | diagnostic or exploratory |
| crossed-null | calibration | long | intended_phones_and_stress | 1200 | 1192 | 0.98690012 | 8 | 0.01309988 | diagnostic or exploratory |
| crossed-null | calibration | long | accepted_phones | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | diagnostic or exploratory |
| crossed-null | calibration | long | accepted_phones_and_stress | 1200 | 1192 | 0.98690012 | 8 | 0.01309988 | diagnostic or exploratory |
| shared-conflicting | calibration | pooled | intended_phones | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | pass |
| shared-conflicting | calibration | pooled | intended_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| shared-conflicting | calibration | pooled | accepted_phones | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | pass |
| shared-conflicting | calibration | pooled | accepted_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| shared-conflicting | calibration | short | intended_phones | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| shared-conflicting | calibration | short | intended_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| shared-conflicting | calibration | short | accepted_phones | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| shared-conflicting | calibration | short | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| shared-conflicting | calibration | long | intended_phones | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | diagnostic or exploratory |
| shared-conflicting | calibration | long | intended_phones_and_stress | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | diagnostic or exploratory |
| shared-conflicting | calibration | long | accepted_phones | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | diagnostic or exploratory |
| shared-conflicting | calibration | long | accepted_phones_and_stress | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | diagnostic or exploratory |
| unequal-draw-multiplicity | calibration | pooled | intended_phones | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | pass |
| unequal-draw-multiplicity | calibration | pooled | intended_phones_and_stress | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | pass |
| unequal-draw-multiplicity | calibration | pooled | accepted_phones | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | pass |
| unequal-draw-multiplicity | calibration | pooled | accepted_phones_and_stress | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | pass |
| unequal-draw-multiplicity | calibration | short | intended_phones | 1200 | 1192 | 0.98690012 | 8 | 0.01309988 | diagnostic or exploratory |
| unequal-draw-multiplicity | calibration | short | intended_phones_and_stress | 1200 | 1190 | 0.98472826 | 10 | 0.01527174 | diagnostic or exploratory |
| unequal-draw-multiplicity | calibration | short | accepted_phones | 1200 | 1192 | 0.98690012 | 8 | 0.01309988 | diagnostic or exploratory |
| unequal-draw-multiplicity | calibration | short | accepted_phones_and_stress | 1200 | 1190 | 0.98472826 | 10 | 0.01527174 | diagnostic or exploratory |
| unequal-draw-multiplicity | calibration | long | intended_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unequal-draw-multiplicity | calibration | long | intended_phones_and_stress | 1200 | 1190 | 0.98472826 | 10 | 0.01527174 | diagnostic or exploratory |
| unequal-draw-multiplicity | calibration | long | accepted_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unequal-draw-multiplicity | calibration | long | accepted_phones_and_stress | 1200 | 1190 | 0.98472826 | 10 | 0.01527174 | diagnostic or exploratory |
| overlapping-acceptance-sets | calibration | pooled | intended_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| overlapping-acceptance-sets | calibration | pooled | intended_phones_and_stress | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | pass |
| overlapping-acceptance-sets | calibration | pooled | accepted_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | pass |
| overlapping-acceptance-sets | calibration | pooled | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | pass |
| overlapping-acceptance-sets | calibration | short | intended_phones | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | diagnostic or exploratory |
| overlapping-acceptance-sets | calibration | short | intended_phones_and_stress | 1200 | 1192 | 0.98690012 | 8 | 0.01309988 | diagnostic or exploratory |
| overlapping-acceptance-sets | calibration | short | accepted_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| overlapping-acceptance-sets | calibration | short | accepted_phones_and_stress | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| overlapping-acceptance-sets | calibration | long | intended_phones | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | diagnostic or exploratory |
| overlapping-acceptance-sets | calibration | long | intended_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| overlapping-acceptance-sets | calibration | long | accepted_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| overlapping-acceptance-sets | calibration | long | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| unequal-acceptance-sets | calibration | pooled | intended_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | pass |
| unequal-acceptance-sets | calibration | pooled | intended_phones_and_stress | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | pass |
| unequal-acceptance-sets | calibration | pooled | accepted_phones | 1200 | 1191 | 0.98580761 | 712 | 0.62078513 | pass |
| unequal-acceptance-sets | calibration | pooled | accepted_phones_and_stress | 1200 | 1197 | 0.99267554 | 1199 | 0.99985288 | pass |
| unequal-acceptance-sets | calibration | short | intended_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| unequal-acceptance-sets | calibration | short | intended_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| unequal-acceptance-sets | calibration | short | accepted_phones | 1200 | 1198 | 0.99394348 | 326 | 0.29753319 | diagnostic or exploratory |
| unequal-acceptance-sets | calibration | short | accepted_phones_and_stress | 1200 | 1197 | 0.99267554 | 1124 | 0.94910218 | diagnostic or exploratory |
| unequal-acceptance-sets | calibration | long | intended_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unequal-acceptance-sets | calibration | long | intended_phones_and_stress | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unequal-acceptance-sets | calibration | long | accepted_phones | 1200 | 1195 | 0.99028328 | 309 | 0.28298613 | diagnostic or exploratory |
| unequal-acceptance-sets | calibration | long | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 1125 | 0.94984882 | diagnostic or exploratory |
| sparse-crossed | calibration | pooled | intended_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | pass |
| sparse-crossed | calibration | pooled | intended_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| sparse-crossed | calibration | pooled | accepted_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | pass |
| sparse-crossed | calibration | pooled | accepted_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| sparse-crossed | calibration | short | intended_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| sparse-crossed | calibration | short | intended_phones_and_stress | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| sparse-crossed | calibration | short | accepted_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| sparse-crossed | calibration | short | accepted_phones_and_stress | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| sparse-crossed | calibration | long | intended_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| sparse-crossed | calibration | long | intended_phones_and_stress | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| sparse-crossed | calibration | long | accepted_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| sparse-crossed | calibration | long | accepted_phones_and_stress | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| rare-primary-agreement | calibration | pooled | intended_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| rare-primary-agreement | calibration | pooled | intended_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| rare-primary-agreement | calibration | pooled | accepted_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| rare-primary-agreement | calibration | pooled | accepted_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| rare-primary-agreement | calibration | short | intended_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| rare-primary-agreement | calibration | short | intended_phones_and_stress | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| rare-primary-agreement | calibration | short | accepted_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| rare-primary-agreement | calibration | short | accepted_phones_and_stress | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| rare-primary-agreement | calibration | long | intended_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| rare-primary-agreement | calibration | long | intended_phones_and_stress | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | diagnostic or exploratory |
| rare-primary-agreement | calibration | long | accepted_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| rare-primary-agreement | calibration | long | accepted_phones_and_stress | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | diagnostic or exploratory |
| missing-completely-at-random | calibration | pooled | intended_phones | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | pass |
| missing-completely-at-random | calibration | pooled | intended_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| missing-completely-at-random | calibration | pooled | accepted_phones | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | pass |
| missing-completely-at-random | calibration | pooled | accepted_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| missing-completely-at-random | calibration | short | intended_phones | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | diagnostic or exploratory |
| missing-completely-at-random | calibration | short | intended_phones_and_stress | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| missing-completely-at-random | calibration | short | accepted_phones | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | diagnostic or exploratory |
| missing-completely-at-random | calibration | short | accepted_phones_and_stress | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| missing-completely-at-random | calibration | long | intended_phones | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | diagnostic or exploratory |
| missing-completely-at-random | calibration | long | intended_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| missing-completely-at-random | calibration | long | accepted_phones | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | diagnostic or exploratory |
| missing-completely-at-random | calibration | long | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| whole-reader-attrition | calibration | pooled | intended_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | pass |
| whole-reader-attrition | calibration | pooled | intended_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| whole-reader-attrition | calibration | pooled | accepted_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | pass |
| whole-reader-attrition | calibration | pooled | accepted_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| whole-reader-attrition | calibration | short | intended_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| whole-reader-attrition | calibration | short | intended_phones_and_stress | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| whole-reader-attrition | calibration | short | accepted_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| whole-reader-attrition | calibration | short | accepted_phones_and_stress | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| whole-reader-attrition | calibration | long | intended_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| whole-reader-attrition | calibration | long | intended_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| whole-reader-attrition | calibration | long | accepted_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| whole-reader-attrition | calibration | long | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| unknown-stress | calibration | pooled | intended_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | pass |
| unknown-stress | calibration | pooled | intended_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| unknown-stress | calibration | pooled | accepted_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | pass |
| unknown-stress | calibration | pooled | accepted_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | pass |
| unknown-stress | calibration | short | intended_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unknown-stress | calibration | short | intended_phones_and_stress | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | diagnostic or exploratory |
| unknown-stress | calibration | short | accepted_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unknown-stress | calibration | short | accepted_phones_and_stress | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | diagnostic or exploratory |
| unknown-stress | calibration | long | intended_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| unknown-stress | calibration | long | intended_phones_and_stress | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | diagnostic or exploratory |
| unknown-stress | calibration | long | accepted_phones | 1200 | 1197 | 0.99267554 | 3 | 0.00732446 | diagnostic or exploratory |
| unknown-stress | calibration | long | accepted_phones_and_stress | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | diagnostic or exploratory |
| unavailable-coding | calibration | pooled | intended_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | pass |
| unavailable-coding | calibration | pooled | intended_phones_and_stress | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | pass |
| unavailable-coding | calibration | pooled | accepted_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | pass |
| unavailable-coding | calibration | pooled | accepted_phones_and_stress | 1200 | 1194 | 0.98913441 | 6 | 0.01086559 | pass |
| unavailable-coding | calibration | short | intended_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| unavailable-coding | calibration | short | intended_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| unavailable-coding | calibration | short | accepted_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| unavailable-coding | calibration | short | accepted_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| unavailable-coding | calibration | long | intended_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unavailable-coding | calibration | long | intended_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| unavailable-coding | calibration | long | accepted_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unavailable-coding | calibration | long | accepted_phones_and_stress | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| candidate-benefit | calibration | pooled | intended_phones | 1200 | 1195 | 0.99028328 | 408 | 0.36727474 | pass |
| candidate-benefit | calibration | pooled | intended_phones_and_stress | 1200 | 1194 | 0.98913441 | 392 | 0.35371853 | pass |
| candidate-benefit | calibration | pooled | accepted_phones | 1200 | 1195 | 0.99028328 | 408 | 0.36727474 | pass |
| candidate-benefit | calibration | pooled | accepted_phones_and_stress | 1200 | 1194 | 0.98913441 | 392 | 0.35371853 | pass |
| candidate-benefit | calibration | short | intended_phones | 1200 | 1196 | 0.99146061 | 165 | 0.15814445 | diagnostic or exploratory |
| candidate-benefit | calibration | short | intended_phones_and_stress | 1200 | 1192 | 0.98690012 | 164 | 0.15726435 | diagnostic or exploratory |
| candidate-benefit | calibration | short | accepted_phones | 1200 | 1196 | 0.99146061 | 165 | 0.15814445 | diagnostic or exploratory |
| candidate-benefit | calibration | short | accepted_phones_and_stress | 1200 | 1192 | 0.98690012 | 164 | 0.15726435 | diagnostic or exploratory |
| candidate-benefit | calibration | long | intended_phones | 1200 | 1194 | 0.98913441 | 184 | 0.17482303 | diagnostic or exploratory |
| candidate-benefit | calibration | long | intended_phones_and_stress | 1200 | 1194 | 0.98913441 | 175 | 0.16693264 | diagnostic or exploratory |
| candidate-benefit | calibration | long | accepted_phones | 1200 | 1194 | 0.98913441 | 184 | 0.17482303 | diagnostic or exploratory |
| candidate-benefit | calibration | long | accepted_phones_and_stress | 1200 | 1194 | 0.98913441 | 175 | 0.16693264 | diagnostic or exploratory |
| candidate-harm | calibration | pooled | intended_phones | 1200 | 1197 | 0.99267554 | 368 | 0.33333850 | pass |
| candidate-harm | calibration | pooled | intended_phones_and_stress | 1200 | 1196 | 0.99146061 | 425 | 0.38165243 | pass |
| candidate-harm | calibration | pooled | accepted_phones | 1200 | 1197 | 0.99267554 | 368 | 0.33333850 | pass |
| candidate-harm | calibration | pooled | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 425 | 0.38165243 | pass |
| candidate-harm | calibration | short | intended_phones | 1200 | 1195 | 0.99028328 | 160 | 0.15374153 | diagnostic or exploratory |
| candidate-harm | calibration | short | intended_phones_and_stress | 1200 | 1195 | 0.99028328 | 174 | 0.16605484 | diagnostic or exploratory |
| candidate-harm | calibration | short | accepted_phones | 1200 | 1195 | 0.99028328 | 160 | 0.15374153 | diagnostic or exploratory |
| candidate-harm | calibration | short | accepted_phones_and_stress | 1200 | 1195 | 0.99028328 | 174 | 0.16605484 | diagnostic or exploratory |
| candidate-harm | calibration | long | intended_phones | 1200 | 1193 | 0.98800806 | 148 | 0.14314879 | diagnostic or exploratory |
| candidate-harm | calibration | long | intended_phones_and_stress | 1200 | 1193 | 0.98800806 | 160 | 0.15374153 | diagnostic or exploratory |
| candidate-harm | calibration | long | accepted_phones | 1200 | 1193 | 0.98800806 | 148 | 0.14314879 | diagnostic or exploratory |
| candidate-harm | calibration | long | accepted_phones_and_stress | 1200 | 1193 | 0.98800806 | 160 | 0.15374153 | diagnostic or exploratory |
| unresolved-source-targets | calibration | pooled | intended_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | pass |
| unresolved-source-targets | calibration | pooled | intended_phones_and_stress | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | pass |
| unresolved-source-targets | calibration | pooled | accepted_phones | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | pass |
| unresolved-source-targets | calibration | pooled | accepted_phones_and_stress | 1200 | 1193 | 0.98800806 | 7 | 0.01199194 | pass |
| unresolved-source-targets | calibration | short | intended_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unresolved-source-targets | calibration | short | intended_phones_and_stress | 1200 | 1190 | 0.98472826 | 10 | 0.01527174 | diagnostic or exploratory |
| unresolved-source-targets | calibration | short | accepted_phones | 1200 | 1195 | 0.99028328 | 5 | 0.00971672 | diagnostic or exploratory |
| unresolved-source-targets | calibration | short | accepted_phones_and_stress | 1200 | 1190 | 0.98472826 | 10 | 0.01527174 | diagnostic or exploratory |
| unresolved-source-targets | calibration | long | intended_phones | 1200 | 1192 | 0.98690012 | 8 | 0.01309988 | diagnostic or exploratory |
| unresolved-source-targets | calibration | long | intended_phones_and_stress | 1200 | 1192 | 0.98690012 | 8 | 0.01309988 | diagnostic or exploratory |
| unresolved-source-targets | calibration | long | accepted_phones | 1200 | 1192 | 0.98690012 | 8 | 0.01309988 | diagnostic or exploratory |
| unresolved-source-targets | calibration | long | accepted_phones_and_stress | 1200 | 1192 | 0.98690012 | 8 | 0.01309988 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | pooled | intended_phones | 1200 | 293 | 0.22070210 | 907 | 0.77929790 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | pooled | intended_phones_and_stress | 1200 | 1 | 0.00014712 | 1199 | 0.99985288 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | pooled | accepted_phones | 1200 | 293 | 0.22070210 | 907 | 0.77929790 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | pooled | accepted_phones_and_stress | 1200 | 1 | 0.00014712 | 1199 | 0.99985288 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | short | intended_phones | 1200 | 754 | 0.60062247 | 446 | 0.39937753 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | short | intended_phones_and_stress | 1200 | 123 | 0.08658817 | 1077 | 0.91341183 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | short | accepted_phones | 1200 | 754 | 0.60062247 | 446 | 0.39937753 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | short | accepted_phones_and_stress | 1200 | 123 | 0.08658817 | 1077 | 0.91341183 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | long | intended_phones | 1200 | 752 | 0.59893637 | 448 | 0.40106363 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | long | intended_phones_and_stress | 1200 | 107 | 0.07432589 | 1093 | 0.92567411 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | long | accepted_phones | 1200 | 752 | 0.59893637 | 448 | 0.40106363 | diagnostic or exploratory |
| informative-candidate-nonresponse | bias-diagnostic | long | accepted_phones_and_stress | 1200 | 107 | 0.07432589 | 1093 | 0.92567411 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | pooled | intended_phones | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | pooled | intended_phones_and_stress | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | pooled | accepted_phones | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | pooled | accepted_phones_and_stress | 1200 | 1200 | 0.99680900 | 0 | 0.00319100 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | short | intended_phones | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | short | intended_phones_and_stress | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | short | accepted_phones | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | short | accepted_phones_and_stress | 1200 | 1199 | 0.99529477 | 1 | 0.00470523 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | long | intended_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | long | intended_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | long | accepted_phones | 1200 | 1198 | 0.99394348 | 2 | 0.00605652 | diagnostic or exploratory |
| difficulty-related-coding-loss | bias-diagnostic | long | accepted_phones_and_stress | 1200 | 1196 | 0.99146061 | 4 | 0.00853939 | diagnostic or exploratory |

## Original command outcomes

| Command | Arm | Original exit code |
| --- | --- | ---: |
| original-control-unit | control | 0 |
| original-control-lint | control | 1 |
| compile-control-diagnostics | control | 0 |
| original-control-quality | control | 0 |
| original-control-trigrams | control | 0 |
| original-control-trace | control | 0 |
| original-control-review-types | control | 0 |
| original-control-review-suite | control | 0 |
| original-candidate-unit | candidate | 0 |
| original-candidate-lint | candidate | 1 |
| compile-candidate-diagnostics | candidate | 0 |
| original-candidate-quality | candidate | 0 |
| original-candidate-trigrams | candidate | 0 |
| original-candidate-trace | candidate | 0 |
| original-candidate-review-types | candidate | 0 |
| original-candidate-review-suite | candidate | 0 |
| native-pair-1-control | control | 0 |
| native-pair-1-candidate | candidate | 0 |
| native-pair-2-control | control | 0 |
| native-pair-2-candidate | candidate | 0 |
| native-pair-3-control | control | 0 |
| native-pair-3-candidate | candidate | 0 |
| native-pair-4-control | control | 0 |
| native-pair-4-candidate | candidate | 0 |
| native-pair-5-control | control | 0 |
| native-pair-5-candidate | candidate | 0 |
| native-pair-6-control | control | 0 |
| native-pair-6-candidate | candidate | 0 |

## Verification and local evidence

Run `python3 -B verify_packet.py --root . --entry Q23` to verify every selected artifact and independently recount every original summary/gate context. `--full-local` additionally rehashes every original and retained raw/source/runtime object on the evidence owner’s machine.

Full local archives preserve all 40,800 original raw inputs/inferences and omitted source/runtime contents. Credentials and complete browser profiles remain private with explicit hashes and exclusion descriptors. Gzip encoding is lossless and deterministic. Independent-inode filesystem clones preserve content while sharing storage extents; they are not an independent-device backup.
