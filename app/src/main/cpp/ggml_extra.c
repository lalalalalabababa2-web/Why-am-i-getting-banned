// A ggml function stable-diffusion.cpp uses that llama.cpp's ggml keeps inside its own library
// (declared in ggml-impl.h without GGML_API, so a shared ggml does not export it). The same few
// lines as ggml.c's, built into the app's library.
#include "ggml-impl.h"

struct ggml_cgraph ggml_graph_view(struct ggml_cgraph * cgraph0, int i0, int i1) {
    struct ggml_cgraph cgraph = {
        /*.size             =*/ 0,
        /*.n_nodes          =*/ i1 - i0,
        /*.n_leafs          =*/ 0,
        /*.nodes            =*/ cgraph0->nodes + i0,
        /*.grads            =*/ NULL,
        /*.grad_accs        =*/ NULL,
        /*.leafs            =*/ NULL,
        /*.use_counts       =*/ cgraph0->use_counts,
        /*.visited_hash_set =*/ cgraph0->visited_hash_set,
        /*.order            =*/ cgraph0->order,
        /*.uid              =*/ 0
    };
    return cgraph;
}
