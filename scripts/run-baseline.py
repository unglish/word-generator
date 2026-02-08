"""
Run baseline scoring 5 times with different random CMU samples to measure variance.
"""
import subprocess
import json
import sys
import os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENV_PYTHON = os.path.join(REPO, '.venv', 'bin', 'python')
SAMPLE_SCRIPT = os.path.join(REPO, 'scripts', 'sample-cmu-words.py')

seeds = [42, 123, 456, 789, 1337]

for seed in seeds:
    # Generate sample
    result = subprocess.run(
        [VENV_PYTHON, SAMPLE_SCRIPT, str(seed)],
        capture_output=True, text=True
    )
    words = json.loads(result.stdout)
    arpabet_words = [w["arpabet"] for w in words]
    
    # Write temp input
    input_path = os.path.join(REPO, f'.tmp-baseline-{seed}.csv')
    output_path = os.path.join(REPO, f'.tmp-baseline-{seed}-out.csv')
    
    with open(input_path, 'w') as f:
        f.write('\n'.join(arpabet_words) + '\n')
    
    # Find corpus
    import uci_phonotactic_calculator
    pkg_dir = os.path.dirname(uci_phonotactic_calculator.__file__)
    corpus = os.path.join(pkg_dir, 'data', 'english.csv')
    
    # Score
    calculator = os.path.join(REPO, '.venv', 'bin', 'uci-phonotactic-calculator')
    subprocess.run([calculator, corpus, input_path, output_path], 
                   capture_output=True, timeout=60)
    
    # Parse
    with open(output_path) as f:
        lines = f.read().strip().split('\n')
    
    headers = lines[0].split(',')
    score_col = 'ngram_n2_pos_none_bound_both_smooth_laplace_weight_none_prob_conditional_agg_prod'
    idx = headers.index(score_col)
    
    scores = [float(line.split(',')[idx]) for line in lines[1:] if line.strip()]
    scores.sort()
    
    mean = sum(scores) / len(scores)
    median = scores[len(scores)//2]
    min_s = scores[0]
    max_s = scores[-1]
    
    print(f"Seed {seed:>5}: mean={mean:>7.2f}  median={median:>7.2f}  min={min_s:>7.2f}  max={max_s:>7.2f}  n={len(scores)}")
    
    # Cleanup
    os.remove(input_path)
    os.remove(output_path)
