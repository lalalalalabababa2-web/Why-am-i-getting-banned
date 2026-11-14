# Skills in this folder

Added at Larpbase's request, as project skills (so they are there in every Claude Code session on
this repository). Each is someone else's work, MIT licensed, copied unchanged with its license:

| Skill | From | Commit | What it does |
|---|---|---|---|
| prompt-master | github.com/nidhinjs/prompt-master | 49b3a72 | Writes a prompt for another AI tool, when asked to |
| ponytail (and -review, -audit, -debt, -gain, -help) | github.com/DietrichGebert/ponytail | 96608e0 | "Lazy senior dev" rules: the smallest change that solves the task. Run /ponytail to turn it on |
| graphify | github.com/safishamsi/graphify | 52cb282 | Builds a knowledge graph of the code (needs `pip install graphifyy`). Run /graphify |

Only the skill files are here. Ponytail's and Graphify's hooks (which switch them on by
themselves in every session) are not installed: for Ponytail, type
`/plugin marketplace add DietrichGebert/ponytail` and then `/plugin install ponytail@ponytail`.
`.graphifyignore` keeps Graphify to the app's own code (not llama.cpp or stable-diffusion.cpp).

To remove one, delete its folder.
