/* One set of miniaudio options for every file that includes it, so struct layouts agree. */
#ifndef HK_MA_CONFIG_H
#define HK_MA_CONFIG_H
#define MA_NO_DECODING
#define MA_NO_ENCODING
#define MA_NO_GENERATION
#define MA_NO_RESOURCE_MANAGER
#define MA_NO_NODE_GRAPH
#define MA_NO_ENGINE
#ifdef __APPLE__
#define MA_NO_RUNTIME_LINKING   /* link CoreAudio/AudioToolbox directly */
#endif
#include "miniaudio/miniaudio.h"
#endif
